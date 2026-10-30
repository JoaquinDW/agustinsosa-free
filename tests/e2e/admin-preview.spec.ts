import { expect, test } from "@playwright/test"

const username = process.env.E2E_ADMIN_USERNAME || "testadmin"
const password = process.env.E2E_ADMIN_PASSWORD || "SosaPreviewTest2026!"

test("limita a cinco los intentos fallidos por IP", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.10" },
  })

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await context.request.post("/api/admin/auth/login", {
      headers: { Origin: baseURL! },
      data: { username, password: "incorrecta" },
    })
    expect(response.status()).toBe(attempt < 5 ? 401 : 429)
  }

  const blocked = await context.request.post("/api/admin/auth/login", {
    headers: { Origin: baseURL! },
    data: { username, password },
  })
  expect(blocked.status()).toBe(429)
  await context.close()
})

test("separa al visitante anónimo de la preview administrativa", async ({
  browser,
}) => {
  const visitor = await browser.newContext()
  const visitorPage = await visitor.newPage()

  await visitorPage.goto("/terminos")
  await expect(visitorPage).toHaveURL(/\/terminos$/)
  await expect(
    visitorPage.getByRole("heading", { name: "PRÓXIMAMENTE" }),
  ).toBeVisible()
  await expect(visitorPage.getByRole("link")).toHaveCount(0)
  expect(
    (await visitor.request.get("/api/admin/site-visibility")).status(),
  ).toBe(401)

  const admin = await browser.newContext()
  const adminPage = await admin.newPage()
  await adminPage.goto("/backoffice")
  await adminPage.getByLabel("Usuario").fill(username)
  await adminPage.getByLabel("Contraseña").fill(password)
  await adminPage.getByRole("button", { name: "Iniciar Sesión" }).click()
  await expect(
    adminPage.getByRole("heading", { name: "Panel de Administración" }),
  ).toBeVisible()

  const sessionCookie = (await admin.cookies()).find(
    (cookie) => cookie.name === "sosa_admin_session",
  )
  expect(sessionCookie?.httpOnly).toBe(true)
  expect(sessionCookie?.sameSite).toBe("Strict")

  const csrfAttempt = await admin.request.put("/api/admin/site-visibility", {
    headers: { Origin: "https://example.invalid" },
    data: { published: true },
  })
  expect(csrfAttempt.status()).toBe(403)

  await adminPage.goto("/")
  await expect(adminPage.getByText("Vista previa privada")).toBeVisible()
  await expect(
    adminPage.getByRole("heading", { name: "PRÓXIMAMENTE" }),
  ).toHaveCount(0)

  const blockedRanking = await visitor.request.get("/api/ranking")
  expect(blockedRanking.status()).toBe(503)
  const previewRanking = await admin.request.get("/api/ranking")
  expect(previewRanking.status()).toBe(200)
  expect(await previewRanking.json()).toEqual(expect.any(Array))
  expect(previewRanking.headers()["cache-control"]).toContain("no-store")

  const blockedOperation = await admin.request.post("/api/transferencia", {
    multipart: {},
  })
  expect(blockedOperation.status()).toBe(503)
  expect(await blockedOperation.json()).toMatchObject({
    code: "SITE_UNPUBLISHED",
  })

  await visitorPage.goto("/free")
  await expect(
    visitorPage.getByRole("heading", { name: "PRÓXIMAMENTE" }),
  ).toBeVisible()

  await adminPage.goto("/backoffice")
  await adminPage.getByRole("button", { name: "Salir" }).click()
  await expect(adminPage.getByLabel("Usuario")).toBeVisible()
  await expect
    .poll(async () =>
      (await admin.cookies()).some(
        (cookie) => cookie.name === "sosa_admin_session",
      ),
    )
    .toBe(false)
  await adminPage.goto("/")
  await expect(
    adminPage.getByRole("heading", { name: "PRÓXIMAMENTE" }),
  ).toBeVisible()
  await admin.close()
  await visitor.close()
})
