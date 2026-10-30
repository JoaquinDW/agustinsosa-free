import { NextRequest, NextResponse } from "next/server"
import { obtenerRankingSorteo, obtenerResultadoRanking, obtenerSorteoActivo } from "@/lib/database"
import { obtenerContenido } from "@/lib/contenido"
import { getAdminSession } from "@/lib/admin-api"
import { requirePublishedOrAdmin } from "@/lib/site-visibility"
import { LIMITE_RANKING_PUBLICO, prepararRankingPublico } from "@/lib/ranking-publico"
import { publicarResultadoRanking } from "@/lib/ranking-premios"

export async function GET(request: NextRequest) {
  const unavailable = await requirePublishedOrAdmin(request)
  if (unavailable) return unavailable
  const headers: Record<string, string> = getAdminSession(request)
    ? { "Cache-Control": "private, no-store", Vary: "Cookie" }
    : { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
  try {
    const [sorteo, contenido] = await Promise.all([obtenerSorteoActivo(), obtenerContenido()])
    if (!sorteo || !contenido.rankingVisible || sorteo.id === "default") {
      return NextResponse.json([], { headers })
    }
    if (sorteo.estado === "sorteado") {
      const resultado = await obtenerResultadoRanking(sorteo.id)
      return NextResponse.json(publicarResultadoRanking(resultado), { headers })
    }
    if (sorteo.estado !== "activo" && sorteo.estado !== "completo") return NextResponse.json([], { headers })
    const filas = await obtenerRankingSorteo(sorteo.id, LIMITE_RANKING_PUBLICO)
    const ranking = prepararRankingPublico(filas)
    return NextResponse.json(ranking, { headers })
  } catch (error) {
    console.error("Error obteniendo ranking público:", error)
    return NextResponse.json({ error: "No se pudo obtener el ranking" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }
}
