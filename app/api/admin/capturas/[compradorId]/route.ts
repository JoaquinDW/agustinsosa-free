import { type NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-api"
import { supabaseAdmin } from "@/lib/supabase-admin"

const PRIVATE_PREFIX = "private://comprobantes/"

/**
 * Abre la captura de Instagram que subió un participante gratuito.
 * GET /api/admin/capturas/{compradorId}?cuenta=agustinsosamotoss
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compradorId: string }> },
) {
  const unauthorized = requireAdminRequest(request)
  if (unauthorized) return unauthorized

  const { compradorId } = await params
  const cuenta = request.nextUrl.searchParams.get("cuenta") || ""

  const { data: comprador, error } = await supabaseAdmin
    .from("compradores")
    .select("datos_encuesta")
    .eq("id", compradorId)
    .maybeSingle()

  const valor = comprador?.datos_encuesta?.capturas_instagram?.[cuenta]
  if (error || typeof valor !== "string" || !valor.startsWith(PRIVATE_PREFIX)) {
    return new NextResponse("Captura no encontrada", { status: 404 })
  }

  const { data, error: signedError } = await supabaseAdmin.storage
    .from("comprobantes")
    .createSignedUrl(valor.slice(PRIVATE_PREFIX.length), 60)

  if (signedError || !data?.signedUrl) {
    return new NextResponse("No se pudo abrir la captura", { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
