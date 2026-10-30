import { NextRequest, NextResponse } from "next/server"
import { eliminarComprador } from "@/lib/database"
import { requireAdminRequest } from "@/lib/admin-api"

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const { compradorId } = await request.json()

    if (!compradorId) {
      return NextResponse.json(
        { error: "ID de comprador requerido" },
        { status: 400 }
      )
    }

    const resultado = await eliminarComprador(compradorId)

    if (!resultado) {
      return NextResponse.json(
        {
          error:
            "No se pudo eliminar el comprador. Puede que sea un ganador o que no exista.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message:
        "Comprador eliminado exitosamente. Sus números están ahora disponibles.",
    })
  } catch (error) {
    console.error("Error en DELETE /api/eliminar-comprador:", error)
    return NextResponse.json(
      { error: "Error al eliminar el comprador" },
      { status: 500 }
    )
  }
}
