import { type NextRequest, NextResponse } from "next/server"
import {
  enviarEmailConfirmacion,
  enviarEmailTransferenciaAprobada,
  enviarEmailTransferenciaRechazada,
} from "@/lib/email"
import { obtenerSorteoActivo } from "@/lib/database"
import { requireAdminRequest } from "@/lib/admin-api"

const TEST_EMAIL = "balthasardeweert@gmail.com"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const { tipo } = await request.json()

    // Obtener el sorteo activo de la base de datos
    const sorteo = await obtenerSorteoActivo()

    if (!sorteo) {
      return NextResponse.json(
        { error: "No se encontró un sorteo activo" },
        { status: 404 },
      )
    }

    // Usar la imagen del carousel_image_1 si existe, sino usar imagen_url
    const imagenSorteo =
      sorteo.carousel_image_1 || sorteo.imagen_url || undefined

    // Datos de prueba
    const datosConfirmacion = {
      nombre: "Agustin SOSA",
      email: TEST_EMAIL,
      cantidadChances: 3,
      numerosAsignados: [7613, 7614, 7615],
      precioPagado: 15000,
      sorteoNombre: sorteo.nombre,
      sorteoImagenUrl: imagenSorteo,
    }

    const datosTransferenciaAprobada = {
      nombre: "Agustin SOSA",
      email: TEST_EMAIL,
      cantidadChances: 3,
      numerosAsignados: [7613, 7614, 7615],
      precioPagado: 15000,
      nombreSorteo: sorteo.nombre,
      sorteoImagenUrl: imagenSorteo,
    }

    const datosTransferenciaRechazada = {
      nombre: "Agustin SOSA",
      email: TEST_EMAIL,
      cantidadChances: 3,
      precioPagado: 15000,
      nombreSorteo: sorteo.nombre,
      motivo: "El comprobante adjunto no es legible. Por favor reenvialo.",
    }

    let resultado

    if (tipo === "confirmacion") {
      resultado = await enviarEmailConfirmacion(datosConfirmacion)
    } else if (tipo === "aprobada") {
      resultado = await enviarEmailTransferenciaAprobada(
        datosTransferenciaAprobada,
      )
    } else if (tipo === "rechazada") {
      resultado = await enviarEmailTransferenciaRechazada(
        datosTransferenciaRechazada,
      )
    } else {
      return NextResponse.json(
        {
          error:
            "Tipo de email no válido. Use 'confirmacion', 'aprobada' o 'rechazada'",
        },
        { status: 400 },
      )
    }

    if (resultado.success) {
      return NextResponse.json({
        success: true,
        message: `Email de ${tipo} enviado exitosamente a ${TEST_EMAIL}`,
        data: resultado.data,
      })
    } else {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error en endpoint de prueba:", error)
    return NextResponse.json(
      { success: false, error: "Error enviando email de prueba" },
      { status: 500 },
    )
  }
}
