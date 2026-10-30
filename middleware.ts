import { NextRequest, NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
} from "@/lib/admin-auth-constants"

export const config = {
  matcher: [
    "/((?!api|backoffice|proximamente|comprobante|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const secret = process.env.ADMIN_SESSION_SECRET
  const username = process.env.ADMIN_USERNAME
  if (!token || !secret || !username || new TextEncoder().encode(secret).length < 32) {
    return false
  }

  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra) return false

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(payload),
    )
    if (!validSignature) return false

    const session = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as {
      version?: number
      username?: string
      issuedAt?: number
      expiresAt?: number
    }
    const now = Math.floor(Date.now() / 1000)

    return Boolean(
      session.version === 1 &&
        session.username === username &&
        Number.isInteger(session.issuedAt) &&
        Number.isInteger(session.expiresAt) &&
        session.issuedAt! <= now + 60 &&
        session.expiresAt! > now &&
        session.expiresAt! - session.issuedAt! === ADMIN_SESSION_TTL_SECONDS,
    )
  } catch {
    return false
  }
}

async function siteIsPublished(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return false

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/configuracion?clave=eq.sitio_publicado&select=valor&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          // Mismo schema que lib/supabase.ts: este sitio lee su propio
          // sitio_publicado en "gratis", no el del sitio principal.
          "Accept-Profile": process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "gratis",
        },
        cache: "no-store",
      },
    )
    if (!response.ok) return false

    const rows = (await response.json()) as Array<{ valor?: string }>
    return rows[0]?.valor === "true"
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const [hasAdminSession, published] = await Promise.all([
    hasValidAdminSession(request),
    siteIsPublished(),
  ])
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete("x-sosa-admin-preview")

  if (hasAdminSession && !published) {
    requestHeaders.set("x-sosa-admin-preview", "true")
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("Vary", "Cookie")
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    return response
  }

  if (published) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const response = NextResponse.rewrite(new URL("/proximamente", request.url), {
    request: { headers: requestHeaders },
  })
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Vary", "Cookie")
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  return response
}
