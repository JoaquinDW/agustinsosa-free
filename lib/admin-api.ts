import { NextRequest, NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  type AdminSession,
  verifyAdminSessionToken,
} from "@/lib/admin-auth"

export function getAdminSession(request: NextRequest): AdminSession | null {
  return verifyAdminSessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  )
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false

  try {
    const originUrl = new URL(origin)
    const requestHost =
      request.headers.get("host") ||
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.nextUrl.host
    const requestProtocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      request.nextUrl.protocol.replace(":", "")

    return (
      originUrl.host === requestHost &&
      originUrl.protocol === `${requestProtocol}:`
    )
  } catch {
    return false
  }
}

export function requireAdminRequest(
  request: NextRequest,
  options: { verifyOrigin?: boolean } = {},
): NextResponse | null {
  if (!getAdminSession(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (options.verifyOrigin && !isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })
  }

  return null
}

export function requireAdminOrCron(request: NextRequest): NextResponse | null {
  if (getAdminSession(request)) return null

  const cronSecret = process.env.CRON_SECRET
  if (
    cronSecret &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`
  ) {
    return null
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}
