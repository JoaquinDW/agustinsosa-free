import { type NextRequest, NextResponse } from "next/server"

/**
 * Proxy de imágenes: sirve archivos del bucket público de Supabase Storage
 * a través de nuestro propio dominio. Se usa en los emails para que la URL
 * de la imagen coincida con el dominio remitente (mejor entregabilidad en
 * Gmail, recomendación de Resend).
 *
 * Ej: /api/imagen/sorteo-images/sorteo-123.png
 *   -> {SUPABASE}/storage/v1/object/public/sorteo-images/sorteo-123.png
 */
const SUPABASE_PUBLIC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  if (!path || path.length === 0) {
    return new NextResponse("Not found", { status: 404 })
  }

  const upstream = `${SUPABASE_PUBLIC}/${path.map(encodeURIComponent).join("/")}`

  const res = await fetch(upstream, { cache: "no-store" })
  if (!res.ok) {
    return new NextResponse("Not found", { status: 404 })
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      // Los nombres llevan timestamp, así que el contenido es inmutable.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
