import { NextRequest, NextResponse } from "next/server"
import { obtenerPromoPorCodigo, obtenerSorteoActivo } from "@/lib/database"
import { validarCodigo } from "@/lib/promos"
import { requirePublishedSite } from "@/lib/site-visibility"

export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const unpublished = await requirePublishedSite(request)
  if (unpublished) return unpublished
  try {
    const { codigo } = await params
    const [promo, sorteo] = await Promise.all([obtenerPromoPorCodigo(codigo), obtenerSorteoActivo()])
    const validez = validarCodigo(promo, promo?.campania || null, new Date(), sorteo?.id)
    if (!sorteo || sorteo.estado !== "activo" || !validez.ok) {
      return NextResponse.json({ valido: false, motivo: validez.ok ? "otro_sorteo" : validez.motivo }, { headers: { "Cache-Control": "no-store" } })
    }
    return NextResponse.json({
      valido: true,
      nombre: promo?.nombre?.trim().split(/\s+/)[0] || "Participante",
      porcentaje: promo!.campania.porcentaje,
      venceAt: promo!.campania.vence_at,
      packsAplicables: promo!.campania.packs_aplicables,
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Error consultando promo pública:", error)
    return NextResponse.json({ valido: false, motivo: "no_existe" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }
}
