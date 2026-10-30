import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import {
  ADMIN_SESSION_TTL_SECONDS,
  adminSessionCookieOptions,
  createAdminSessionToken,
  hashAdminPassword,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from "../lib/admin-auth"

const originalEnvironment = {
  username: process.env.ADMIN_USERNAME,
  passwordHash: process.env.ADMIN_PASSWORD_HASH,
  sessionSecret: process.env.ADMIN_SESSION_SECRET,
  nodeEnv: process.env.NODE_ENV,
}

before(async () => {
  process.env.ADMIN_USERNAME = "test-admin"
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-with-at-least-32-bytes-long"
  process.env.ADMIN_PASSWORD_HASH = await hashAdminPassword(
    "una-clave-de-prueba-segura",
  )
})

after(() => {
  process.env.ADMIN_USERNAME = originalEnvironment.username
  process.env.ADMIN_PASSWORD_HASH = originalEnvironment.passwordHash
  process.env.ADMIN_SESSION_SECRET = originalEnvironment.sessionSecret
})

test("verifica el hash scrypt sin aceptar una contraseña incorrecta", async () => {
  assert.equal(await verifyAdminPassword("una-clave-de-prueba-segura"), true)
  assert.equal(await verifyAdminPassword("una-clave-incorrecta"), false)
})

test("crea una sesión válida por exactamente 24 horas", () => {
  const now = Date.UTC(2026, 8, 14, 12, 0, 0)
  const { token, session } = createAdminSessionToken("test-admin", now)

  assert.equal(
    session.expiresAt - session.issuedAt,
    ADMIN_SESSION_TTL_SECONDS,
  )
  assert.deepEqual(verifyAdminSessionToken(token, now), session)
  assert.equal(
    verifyAdminSessionToken(token, now + ADMIN_SESSION_TTL_SECONDS * 1000),
    null,
  )
})

test("rechaza cookies manipuladas y secretos rotados", () => {
  const { token } = createAdminSessionToken("test-admin")
  const [payload, signature] = token.split(".")
  const replacement = signature.startsWith("a") ? "b" : "a"

  assert.equal(
    verifyAdminSessionToken(`${payload}.${replacement}${signature.slice(1)}`),
    null,
  )

  process.env.ADMIN_SESSION_SECRET =
    "a-different-session-secret-with-at-least-32-bytes"
  assert.equal(verifyAdminSessionToken(token), null)
  process.env.ADMIN_SESSION_SECRET =
    "test-session-secret-with-at-least-32-bytes-long"
})

test("configura una cookie HttpOnly, SameSite Strict y de alcance global", () => {
  const options = adminSessionCookieOptions(true)
  assert.equal(options.httpOnly, true)
  assert.equal(options.secure, true)
  assert.equal(options.sameSite, "strict")
  assert.equal(options.path, "/")
  assert.equal(options.maxAge, ADMIN_SESSION_TTL_SECONDS)
})
