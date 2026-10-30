import { type NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-api"
import {
  isSitePublished,
  setSitePublished,
} from "@/lib/site-visibility"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request)
  if (unauthorized) return unauthorized

  return NextResponse.json(
    { published: await isSitePublished() },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  let body: { published?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  if (typeof body.published !== "boolean") {
    return NextResponse.json(
      { error: "El campo published debe ser booleano" },
      { status: 400 },
    )
  }

  if (!(await setSitePublished(body.published))) {
    return NextResponse.json(
      { error: "No se pudo cambiar el estado del sitio" },
      { status: 500 },
    )
  }

  return NextResponse.json({ published: body.published })
}
