import { type NextRequest, NextResponse } from "next/server"
import { obtenerEstadisticasSorteo } from "@/lib/database"
import { requirePublishedOrAdmin } from "@/lib/site-visibility"

export async function GET(request: NextRequest) {
  const unavailable = await requirePublishedOrAdmin(request)
  if (unavailable) return unavailable

  const sorteoId = request.nextUrl.searchParams.get("sorteoId")
  if (!sorteoId) {
    return NextResponse.json({ error: "Sorteo requerido" }, { status: 400 })
  }

  const stats = await obtenerEstadisticasSorteo(sorteoId)
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } })
}
