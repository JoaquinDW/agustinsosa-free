import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getAdminSession } from "@/lib/admin-api"

export const SITE_VISIBILITY_KEY = "sitio_publicado"

// Sitio de sorteos gratis: siempre publicado. La pantalla "Próximamente" es
// solo del sitio principal (agustinsosa.com).
export async function isSitePublished(): Promise<boolean> {
  return true
}

export async function setSitePublished(published: boolean): Promise<boolean> {
  const { error } = await supabaseAdmin.from("configuracion").upsert({
    clave: SITE_VISIBILITY_KEY,
    valor: String(published),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("No se pudo actualizar el estado de publicación:", error)
    return false
  }

  return true
}

export async function requirePublishedSite(
  _request?: NextRequest,
): Promise<NextResponse | null> {
  if (await isSitePublished()) return null

  return NextResponse.json(
    {
      error: "El sitio todavía no está publicado",
      code: "SITE_UNPUBLISHED",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}

export async function requirePublishedOrAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (getAdminSession(request) || (await isSitePublished())) return null

  return NextResponse.json(
    {
      error: "El sitio todavía no está publicado",
      code: "SITE_UNPUBLISHED",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
