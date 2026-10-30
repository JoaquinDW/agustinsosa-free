import { NextRequest, NextResponse } from "next/server"
import { actualizarImagenesCarrusel } from "@/lib/database"
import { requireAdminRequest } from "@/lib/admin-api"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const { sorteoId, posicion, imagenUrl } = await request.json()

    if (!sorteoId || !posicion) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      )
    }

    if (posicion < 1 || posicion > 8) {
      return NextResponse.json(
        { error: "Posición debe ser entre 1 y 8" },
        { status: 400 }
      )
    }

    // Preparar los argumentos para la función de actualización
    const updateArgs: [string, string?, string?, string?, string?, string?, string?, string?, string?] = [sorteoId]

    if (posicion === 1) {
      updateArgs[1] = imagenUrl
    } else if (posicion === 2) {
      updateArgs[2] = imagenUrl
    } else if (posicion === 3) {
      updateArgs[3] = imagenUrl
    } else if (posicion === 4) {
      updateArgs[4] = imagenUrl
    } else if (posicion === 5) {
      updateArgs[5] = imagenUrl
    } else if (posicion === 6) {
      updateArgs[6] = imagenUrl
    } else if (posicion === 7) {
      updateArgs[7] = imagenUrl
    } else if (posicion === 8) {
      updateArgs[8] = imagenUrl
    }

    const exito = await actualizarImagenesCarrusel(...updateArgs)

    if (exito) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: "No se pudo actualizar la imagen del carrusel" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error en API actualizar-carousel:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
