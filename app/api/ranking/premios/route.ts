import { type NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-api"
import { obtenerPremiosRanking, obtenerSorteoActivo } from "@/lib/database"
import { obtenerContenido } from "@/lib/contenido"
import { requirePublishedOrAdmin } from "@/lib/site-visibility"

export async function GET(request: NextRequest) {
  const unavailable = await requirePublishedOrAdmin(request)
  if (unavailable) return unavailable
  const headers: Record<string, string> = getAdminSession(request)
    ? { "Cache-Control": "private, no-store", Vary: "Cookie" }
    : { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
  try {
    const [sorteo, contenido] = await Promise.all([obtenerSorteoActivo(), obtenerContenido()])
    if (!sorteo || sorteo.id === "default" || !contenido.rankingVisible || !["activo", "completo", "sorteado"].includes(sorteo.estado)) {
      return NextResponse.json({ premios: [], finalizado: false }, { headers })
    }
    const premios = await obtenerPremiosRanking(sorteo.id)
    return NextResponse.json({ premios, finalizado: sorteo.estado === "sorteado" }, { headers })
  } catch (error) {
    console.error("Error obteniendo premios del ranking:", error)
    return NextResponse.json({ error: "No se pudieron obtener los premios" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }
}
