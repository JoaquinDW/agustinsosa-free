import { type NextRequest, NextResponse } from "next/server"
import {
  crearCompradorGratuito,
  existeParticipacionGratuita,
  generarNumerosUnicos,
  obtenerSorteoActivo,
} from "@/lib/database"
import { verificarNumerosUnicos } from "@/lib/verificarNumerosUnicos"
import { enviarEmailConfirmacion } from "@/lib/email"
import { requirePublishedSite } from "@/lib/site-visibility"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"
import { limpiarOrigen, registrarLead } from "@/lib/leads"

export async function POST(request: NextRequest) {
  const unpublished = await requirePublishedSite(request)
  if (unpublished) return unpublished

  try {
    const body = await request.json()
    const { nombre, email, telefono, aceptaEmail, aceptaWhatsapp, origen } = body ?? {}

    // Validar campos de contacto obligatorios
    if (!nombre?.trim() || !email?.trim() || !telefono?.trim()) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (nombre, email y teléfono)." },
        { status: 400 }
      )
    }
    if (!normalizarTelefono(telefono)) {
      return NextResponse.json({ error: "Ingresá un número de teléfono válido." }, { status: 400 })
    }

    const emailNormalizado = email.trim().toLowerCase()

    // Obtener el sorteo vigente
    const sorteo = await obtenerSorteoActivo()
    if (!sorteo) {
      return NextResponse.json({ error: "No hay un sorteo disponible." }, { status: 404 })
    }

    // Si el sorteo ya no admite participantes, no quedan números para asignar
    if (sorteo.estado !== "activo") {
      return NextResponse.json(
        {
          error:
            "Este sorteo ya no está disponible para participar. ¡Atento a la próxima promoción!",
        },
        { status: 409 }
      )
    }

    // Límite: una participación gratuita por email por sorteo
    const yaParticipo = await existeParticipacionGratuita(sorteo.id, emailNormalizado)
    if (yaParticipo) {
      return NextResponse.json(
        { error: "Ya participaste gratis en este sorteo con este email." },
        { status: 409 }
      )
    }

    // Generar 1 número único del mismo pool del sorteo
    const numerosAsignados = await generarNumerosUnicos(sorteo.id, 1)

    if (!numerosAsignados || numerosAsignados.length < 1) {
      return NextResponse.json(
        { error: "No hay números disponibles en este momento." },
        { status: 409 }
      )
    }

    // Validación post-generación: asegurar que no haya duplicados
    const verificacion = await verificarNumerosUnicos(sorteo.id, numerosAsignados)
    if (verificacion.duplicados) {
      console.error("❌ DUPLICADOS DETECTADOS en participacion-gratuita:", {
        sorteoId: sorteo.id,
        numerosGenerados: numerosAsignados,
        conflictos: verificacion.numerosConflicto,
        mensaje: verificacion.mensaje,
      })
      return NextResponse.json(
        {
          error: "Error generando tu número. Por favor, intentá nuevamente.",
          detalles:
            process.env.NODE_ENV === "development" ? verificacion.mensaje : undefined,
        },
        { status: 500 }
      )
    }

    // Crear el participante gratuito
    const nuevoComprador = await crearCompradorGratuito({
      sorteoId: sorteo.id,
      nombre: nombre.trim(),
      email: emailNormalizado,
      telefono: telefono.trim(),
      numerosAsignados,
    })

    if (!nuevoComprador) {
      return NextResponse.json(
        { error: "Error registrando tu participación." },
        { status: 500 }
      )
    }

    // Guardar el contacto para promociones del sitio principal. Si falla, la
    // participación ya quedó registrada: no se le devuelve error al usuario.
    try {
      const telefonoNormalizado = normalizarTelefono(telefono)
      await registrarLead({
        nombre: nombre.trim(),
        email: emailNormalizado,
        telefono: telefonoNormalizado,
        pais: telefonoNormalizado?.startsWith("595") ? "PY" : "AR",
        aceptaEmail: aceptaEmail === true,
        aceptaWhatsapp: aceptaWhatsapp === true,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        origen: limpiarOrigen(origen),
        sorteoId: sorteo.id,
      })
    } catch (leadError) {
      console.error("Error registrando lead:", leadError)
    }

    // Enviar email de confirmación directamente (no fallar la operación si el email falla).
    // Se llama a la función en vez de hacer fetch a /api/send-email para garantizar que
    // se use el template gratuito de ESTE entorno (evita pegarle a un deploy con código viejo).
    try {
      await enviarEmailConfirmacion({
        nombre: nombre.trim(),
        email: emailNormalizado,
        cantidadChances: 1,
        numerosAsignados,
        precioPagado: 0,
        sorteoNombre: sorteo.nombre,
        sorteoImagenUrl: sorteo.carousel_image_1 || sorteo.imagen_url || undefined,
        // Sin compradorId a propósito: no hay contenido digital para participaciones gratuitas.
        esGratuito: true,
      })
    } catch (emailError) {
      console.error("Error enviando email de participación gratuita:", emailError)
    }

    return NextResponse.json({
      success: true,
      numeroAsignado: numerosAsignados[0],
      compradorId: nuevoComprador.id,
    })
  } catch (error) {
    console.error("Error en participación gratuita:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
