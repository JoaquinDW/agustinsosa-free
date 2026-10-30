import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  BUCKET_CONTENIDO,
  obtenerContenidosPorChances,
} from "@/lib/contenido-packs"
import type { Sorteo } from "@/lib/supabase"

/**
 * Descarga gateada del contenido digital según el pack comprado.
 *
 * GET /api/descargar/{compradorId}
 *  - Verifica que el comprador exista y esté pagado.
 *  - Resuelve el archivo según su cantidad de chances.
 *  - Redirige a una signed URL de corta duración del bucket privado.
 *
 * El {compradorId} es un UUID no adivinable y oficia de token de acceso.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // El contenido digital dejó de formar parte de las compras. Conservamos la
  // ruta para responder de forma explícita a enlaces antiguos sin entregar
  // archivos del bucket privado.
  return NextResponse.json(
    { error: "La descarga de contenido ya no está disponible." },
    { status: 410 },
  )

  /* Flujo anterior de entrega de contenido digital.
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Falta el identificador" }, { status: 400 })
    }

    // 1. Cargar el comprador
    const { data: comprador, error: compradorError } = await supabaseAdmin
      .from("compradores")
      .select("id, sorteo_id, cantidad_chances, estado_pago")
      .eq("id", id)
      .maybeSingle()

    if (compradorError) {
      console.error("Error buscando comprador para descarga:", compradorError)
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }

    if (!comprador || comprador.estado_pago !== "pagado") {
      return NextResponse.json(
        { error: "No encontramos una compra confirmada para este enlace." },
        { status: 403 },
      )
    }

    // 2. Cargar el sorteo para resolver a qué pack corresponde la compra
    const { data: sorteo, error: sorteoError } = await supabaseAdmin
      .from("sorteos")
      .select("*")
      .eq("id", comprador.sorteo_id)
      .maybeSingle()

    if (sorteoError || !sorteo) {
      console.error("Error buscando sorteo para descarga:", sorteoError)
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 })
    }

    // 3. Resolver los contenidos del pack (puede ser más de uno)
    const contenidos = obtenerContenidosPorChances(
      sorteo as Sorteo,
      comprador.cantidad_chances,
    )

    if (contenidos.length === 0) {
      return NextResponse.json(
        { error: "Tu pack no tiene contenido descargable asociado." },
        { status: 404 },
      )
    }

    // 4. Generar signed URLs de corta duración (120s) que fuerzan la descarga
    const firmados = await Promise.all(
      contenidos.map(async (contenido) => {
        const { data: signed, error: signedError } = await supabaseAdmin.storage
          .from(BUCKET_CONTENIDO)
          .createSignedUrl(contenido.storagePath, 120, {
            download: contenido.filename,
          })
        return { contenido, signedUrl: signed?.signedUrl, signedError }
      }),
    )

    if (firmados.some((f) => f.signedError || !f.signedUrl)) {
      console.error(
        "Error generando signed URL:",
        firmados.find((f) => f.signedError)?.signedError,
      )
      return NextResponse.json(
        { error: "No se pudo generar la descarga. Intentá de nuevo." },
        { status: 500 },
      )
    }

    // 5a. Un solo archivo: redirigir directo (descarga inmediata)
    if (firmados.length === 1) {
      return NextResponse.redirect(firmados[0].signedUrl!)
    }

    // 5b. Varios archivos (pack completo): página con un botón por descarga
    return new NextResponse(paginaDescargas(firmados), {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  } catch (error) {
    console.error("Error en descarga de contenido:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
  */
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Página intermedia para packs con varios descargables (p. ej. el pack 4):
 * muestra un botón por archivo. Las signed URLs duran 120s, así que se
 * regenera entrando de nuevo a /api/descargar/[id].
 */
function paginaDescargas(
  firmados: { contenido: { titulo: string }; signedUrl?: string }[],
): string {
  const botones = firmados
    .map(
      (f) => `
      <a href="${f.signedUrl}" class="boton">📥 ${escapeHtml(f.contenido.titulo)}</a>`,
    )
    .join("")

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Tu contenido digital</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:#0a0a0a; color:#fff; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
    .card { width:100%; max-width:440px; background:#141414; border:1px solid rgba(255,0,64,0.30); border-radius:16px; padding:28px; text-align:center; }
    h1 { font-size:20px; margin:0 0 6px; }
    p { color:#a3a3a3; font-size:14px; margin:0 0 22px; }
    .boton { display:block; background:linear-gradient(135deg,#ff0040,#cc0033); color:#fff; font-weight:800; font-size:15px; text-decoration:none; padding:14px 20px; border-radius:10px; margin:10px 0; box-shadow:0 4px 14px rgba(255,0,64,0.35); }
    .nota { color:#737373; font-size:12px; margin:18px 0 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📦 ¡Tu contenido digital está listo!</h1>
    <p>Descargá cada archivo que viene con tu pack.</p>
    ${botones}
    <p class="nota">Si un enlace expira, recargá esta página para volver a generarlos.</p>
  </div>
</body>
</html>`
}
