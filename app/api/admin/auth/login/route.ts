import { createHmac } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth"
import { isSameOrigin } from "@/lib/admin-api"
import { supabaseAdmin } from "@/lib/supabase-admin"

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 5
type RateLimitState = {
  blocked: boolean
  retryAfter?: number
  failedAttempts: number
  unavailable?: boolean
}

const developmentAttempts = new Map<
  string,
  { failedAttempts: number; blockedUntil: number; updatedAt: number }
>()

function getDevelopmentRateLimit(identifier: string): RateLimitState {
  const record = developmentAttempts.get(identifier)
  if (!record || Date.now() - record.updatedAt > WINDOW_MS) {
    developmentAttempts.delete(identifier)
    return { blocked: false, failedAttempts: 0 }
  }

  return {
    blocked: record.blockedUntil > Date.now(),
    retryAfter: Math.max(
      1,
      Math.ceil((record.blockedUntil - Date.now()) / 1000),
    ),
    failedAttempts: record.failedAttempts,
  }
}

function recordDevelopmentFailure(identifier: string): RateLimitState {
  const current = getDevelopmentRateLimit(identifier)
  const failedAttempts = current.failedAttempts + 1
  const blockedUntil =
    failedAttempts >= MAX_FAILED_ATTEMPTS ? Date.now() + WINDOW_MS : 0
  developmentAttempts.set(identifier, {
    failedAttempts,
    blockedUntil,
    updatedAt: Date.now(),
  })
  return getDevelopmentRateLimit(identifier)
}

function requestFingerprint(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "unknown"
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "")
    .update(ip)
    .digest("hex")
}

async function getRateLimit(identifier: string): Promise<RateLimitState> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("failed_attempts, blocked_until, updated_at")
      .eq("identifier_hash", identifier)
      .maybeSingle()

    if (error) throw error
    if (!data) return { blocked: false, failedAttempts: 0 }

    const blockedUntil = data.blocked_until
      ? new Date(data.blocked_until).getTime()
      : 0
    const updatedAt = new Date(data.updated_at).getTime()

    return {
      blocked: blockedUntil > Date.now(),
      retryAfter: Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000)),
      failedAttempts:
        Date.now() - updatedAt > WINDOW_MS ? 0 : data.failed_attempts,
    }
  } catch (error) {
    console.error("No se pudo consultar el límite de login:", error)
    return process.env.NODE_ENV === "production"
      ? { blocked: true, failedAttempts: 0, unavailable: true }
      : getDevelopmentRateLimit(identifier)
  }
}

async function recordFailedAttempt(
  identifier: string,
): Promise<RateLimitState | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "record_admin_login_failure",
      { p_identifier_hash: identifier },
    )
    if (error) throw error

    const record = Array.isArray(data) ? data[0] : data
    const blockedUntil = record?.blocked_until
      ? new Date(record.blocked_until).getTime()
      : 0
    return {
      blocked: blockedUntil > Date.now(),
      retryAfter: Math.max(
        1,
        Math.ceil((blockedUntil - Date.now()) / 1000),
      ),
      failedAttempts: Number(record?.failed_attempts || 0),
    }
  } catch (error) {
    console.error("No se pudo registrar el intento de login:", error)
    return process.env.NODE_ENV === "production"
      ? null
      : recordDevelopmentFailure(identifier)
  }
}

async function clearFailedAttempts(identifier: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("admin_login_attempts")
    .delete()
    .eq("identifier_hash", identifier)

  if (error) {
    console.error("No se pudo limpiar el límite de login:", error)
    if (process.env.NODE_ENV === "production") return false
  }
  developmentAttempts.delete(identifier)
  return true
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })
  }

  if (!isAdminAuthConfigured()) {
    console.error("Las variables de autenticación administrativa están incompletas")
    return NextResponse.json(
      { error: "El acceso administrativo no está configurado" },
      { status: 503 },
    )
  }

  const identifier = requestFingerprint(request)
  const rateLimit = await getRateLimit(identifier)
  if (rateLimit.unavailable) {
    return NextResponse.json(
      { error: "El acceso administrativo no está disponible" },
      { status: 503 },
    )
  }
  if (rateLimit.blocked) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intentá nuevamente más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    )
  }

  let body: { username?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const username = body.username?.trim() || ""
  const password = body.password || ""
  const usernameMatches = username === process.env.ADMIN_USERNAME
  const passwordMatches = await verifyAdminPassword(password)

  if (!usernameMatches || !passwordMatches) {
    const updatedRateLimit = await recordFailedAttempt(identifier)
    if (!updatedRateLimit) {
      return NextResponse.json(
        { error: "El acceso administrativo no está disponible" },
        { status: 503 },
      )
    }
    if (updatedRateLimit.blocked) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá nuevamente más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(updatedRateLimit.retryAfter || 1),
          },
        },
      )
    }
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 },
    )
  }

  if (!(await clearFailedAttempts(identifier))) {
    return NextResponse.json(
      { error: "El acceso administrativo no está disponible" },
      { status: 503 },
    )
  }
  const { token, session } = createAdminSessionToken(username)
  const response = NextResponse.json({
    authenticated: true,
    expiresAt: session.expiresAt,
  })
  response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions())
  response.headers.set("Cache-Control", "no-store")
  return response
}
