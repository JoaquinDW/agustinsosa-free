import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "crypto"
import { promisify } from "util"
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
} from "@/lib/admin-auth-constants"

export { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS }

const PASSWORD_PREFIX = "scrypt"
const PASSWORD_KEY_LENGTH = 64
const SESSION_VERSION = 1
const scrypt = promisify(nodeScrypt)

export interface AdminSession {
  version: number
  username: string
  issuedAt: number
  expiresAt: number
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url")
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url")
}

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET
  return secret && Buffer.byteLength(secret) >= 32 ? secret : null
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD_HASH &&
      getSessionSecret(),
  )
}

export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error("La contraseña debe tener al menos 12 caracteres")
  }

  const salt = randomBytes(24)
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer
  return [PASSWORD_PREFIX, toBase64Url(salt), toBase64Url(derived)].join("$")
}

export async function verifyAdminPassword(
  password: string,
  encodedHash = process.env.ADMIN_PASSWORD_HASH,
): Promise<boolean> {
  if (!encodedHash) return false

  const [prefix, saltValue, expectedValue, extra] = encodedHash.split("$")
  if (prefix !== PASSWORD_PREFIX || !saltValue || !expectedValue || extra) {
    return false
  }

  try {
    const salt = fromBase64Url(saltValue)
    const expected = fromBase64Url(expectedValue)
    if (expected.length !== PASSWORD_KEY_LENGTH) return false

    const actual = (await scrypt(password, salt, expected.length)) as Buffer
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createAdminSessionToken(
  username: string,
  now = Date.now(),
): { token: string; session: AdminSession } {
  const secret = getSessionSecret()
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET debe existir y tener al menos 32 bytes",
    )
  }

  const issuedAt = Math.floor(now / 1000)
  const session: AdminSession = {
    version: SESSION_VERSION,
    username,
    issuedAt,
    expiresAt: issuedAt + ADMIN_SESSION_TTL_SECONDS,
  }
  const payload = toBase64Url(JSON.stringify(session))
  return { token: `${payload}.${signPayload(payload, secret)}`, session }
}

export function verifyAdminSessionToken(
  token: string | null | undefined,
  now = Date.now(),
): AdminSession | null {
  if (!token) return null

  const secret = getSessionSecret()
  const expectedUsername = process.env.ADMIN_USERNAME
  if (!secret || !expectedUsername) return null

  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra) return null

  try {
    const expectedSignature = signPayload(payload, secret)
    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null
    }

    const session = JSON.parse(
      fromBase64Url(payload).toString("utf8"),
    ) as AdminSession
    const currentTime = Math.floor(now / 1000)

    if (
      session.version !== SESSION_VERSION ||
      session.username !== expectedUsername ||
      !Number.isInteger(session.issuedAt) ||
      !Number.isInteger(session.expiresAt) ||
      session.issuedAt > currentTime + 60 ||
      session.expiresAt <= currentTime ||
      session.expiresAt - session.issuedAt !== ADMIN_SESSION_TTL_SECONDS
    ) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export function adminSessionCookieOptions(
  isProduction = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  }
}
