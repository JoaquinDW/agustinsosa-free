import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requirePublishedSite } from "@/lib/site-visibility"

export async function GET(request: NextRequest) {
  const unpublished = await requirePublishedSite(request)
  if (unpublished) return unpublished

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("compradores")
    .select(`id, nombre, numeros_asignados, cantidad_chances, created_at, sorteos!compradores_sorteo_id_fkey(nombre, estado)`)
    .ilike("email", email)
    .eq("estado_pago", "pagado")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error buscando por email:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  const participaciones = (data || [])
    .filter((row: any) => row.sorteos?.estado === "activo")
    .map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      numeros_asignados: row.numeros_asignados || [],
      cantidad_chances: row.cantidad_chances,
      sorteo_nombre: row.sorteos?.nombre ?? "Sorteo",
      created_at: row.created_at,
    }))

  return NextResponse.json({ participaciones })
}
