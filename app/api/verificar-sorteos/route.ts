import { type NextRequest, NextResponse } from "next/server"
import { requireAdminOrCron } from "@/lib/admin-api"

async function executeVerification(request: NextRequest) {
  const unauthorized = requireAdminOrCron(request)
  if (unauthorized) return unauthorized

  try {
    console.log("🚀 Ejecutando verificación de sorteos via API...")

    // Importar dinámicamente para evitar problemas en el build
    const { verificarYEjecutarSorteos } = await import(
      "../../../lib/sorteoScrapper"
    )

    await verificarYEjecutarSorteos()

    return NextResponse.json({
      success: true,
      message: "Verificación de sorteos ejecutada correctamente",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error en verificación de sorteos:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

// Vercel Cron invoca con GET. POST se conserva para ejecuciones manuales desde
// el backoffice o desde scripts internos.
export const GET = executeVerification
export const POST = executeVerification
