import { type NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-api"
import { supabaseAdmin } from "@/lib/supabase-admin"

function extractReceiptPath(value: string): string | null {
  const privatePrefix = "private://comprobantes/"
  if (value.startsWith(privatePrefix)) return value.slice(privatePrefix.length)

  const publicMarker = "/storage/v1/object/public/comprobantes/"
  const markerIndex = value.indexOf(publicMarker)
  if (markerIndex >= 0) {
    return decodeURIComponent(value.slice(markerIndex + publicMarker.length))
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compradorId: string }> },
) {
  const unauthorized = requireAdminRequest(request)
  if (unauthorized) return unauthorized

  const { compradorId } = await params
  const { data: comprador, error } = await supabaseAdmin
    .from("compradores")
    .select("comprobante_url")
    .eq("id", compradorId)
    .maybeSingle()

  if (error || !comprador?.comprobante_url) {
    return new NextResponse("Comprobante no encontrado", { status: 404 })
  }

  const path = extractReceiptPath(comprador.comprobante_url)
  if (!path) {
    try {
      const externalUrl = new URL(comprador.comprobante_url)
      if (externalUrl.protocol === "https:") {
        return NextResponse.redirect(externalUrl)
      }
    } catch {
      // El valor no es una URL válida ni una ruta de Storage conocida.
    }
    return new NextResponse("Comprobante no disponible", { status: 404 })
  }

  const { data, error: signedError } = await supabaseAdmin.storage
    .from("comprobantes")
    .createSignedUrl(path, 60)

  if (signedError || !data?.signedUrl) {
    return new NextResponse("No se pudo abrir el comprobante", { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
