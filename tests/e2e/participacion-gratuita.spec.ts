import { expect, test } from "@playwright/test"

test("exige la captura de Instagram y el canal, conserva los datos y permite reintentar", async ({ page }) => {
  await page.route("http://127.0.0.1:54321/**", (route) =>
    route.fulfill({ json: [] }),
  )
  let envios = 0
  await page.route("**/api/participacion-gratuita", async (route) => {
    const body = route.request().postDataBuffer()!.toString()
    expect(body).toContain('name="captura_agustinsosamotoss"')
    expect(body).not.toContain("sosa.motos.oficial")
    for (const campo of ["sigueCanalWhatsapp", "aceptaBases"]) {
      expect(body).toContain(`name="${campo}"\r\n\r\ntrue`)
    }
    // Entrar al canal no equivale a consentir mensajes de marketing.
    for (const campo of ["aceptaEmail", "aceptaWhatsapp"]) {
      expect(body).toContain(`name="${campo}"\r\n\r\nfalse`)
    }
    envios += 1
    await route.fulfill(envios === 1
      ? { status: 409, json: { error: "Ya hay una participación con este email." } }
      : { json: { success: true, numeroAsignado: 42 } })
  })

  await page.goto("/free")
  await expect(page.getByRole("heading", { name: "Participá en 3 pasos" })).toBeVisible()
  await expect(page.getByRole("heading", { name: /Seguí a Agustín Sosa/ })).toBeVisible()
  await expect(page.getByRole("link", { name: "Seguir en Instagram" })).toBeVisible()
  await expect(page.locator('input[type="file"]')).toHaveCount(1)
  await expect(page.getByText("Subí una captura que muestre que lo seguís. Es obligatoria.")).toBeVisible()
  await expect(page.getByRole("link", { name: "Entrar al canal" })).toHaveAttribute(
    "href", "https://whatsapp.com/channel/0029VaB9bCi6GcGLs2JEvM12",
  )
  await page.getByLabel("Nombre y apellido").fill("Participante de prueba")
  await page.getByLabel("Tu Instagram", { exact: false }).fill("@participante")
  await page.getByLabel("Tu WhatsApp").fill("379 4123456")
  await page.getByRole("textbox", { name: "Email *", exact: true }).fill("prueba@example.com")
  await page.getByRole("checkbox", { name: /Soy mayor/ }).check()
  await page.getByRole("button", { name: "Participar gratis" }).click()
  expect(envios).toBe(0)
  expect(await page.getByRole("checkbox", { name: "Ya sigo el canal" }).evaluate(
    (input: HTMLInputElement) => input.validity.valueMissing,
  )).toBe(true)

  await page.getByRole("checkbox", { name: "Ya sigo el canal" }).check()
  await page.getByRole("button", { name: "Participar gratis" }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Subí una captura donde se vea que seguís a Agustín.")
  expect(envios).toBe(0)
  await page.locator('input[type="file"]').setInputFiles({
    name: "captura.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  })
  await expect(page.getByText("Captura lista · Cambiar")).toBeVisible()
  await page.getByRole("button", { name: "Participar gratis" }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("Ya hay una participación con este email.")
  await expect(page.getByLabel("Nombre y apellido")).toHaveValue("Participante de prueba")
  await page.getByRole("button", { name: "Participar gratis" }).click()
  await expect(page.getByRole("heading", { name: "¡Participación confirmada!" })).toBeVisible()
  await expect(page.getByText("42", { exact: true })).toBeVisible()
  expect(envios).toBe(2)
})

test("el servidor rechaza requisitos incompletos antes de registrar la participación", async ({ request }) => {
  const datos = {
    nombre: "Prueba", email: "prueba@example.com", telefono: "379 4123456", instagram: "prueba",
  }
  const sinCanal = await request.post("/api/participacion-gratuita", { multipart: datos })
  expect(sinCanal.status()).toBe(400)
  expect((await sinCanal.json()).error).toContain("Ya sigo el canal")

  const sinBases = await request.post("/api/participacion-gratuita", {
    multipart: { ...datos, sigueCanalWhatsapp: "true" },
  })
  expect(sinBases.status()).toBe(400)
  expect((await sinBases.json()).error).toContain("aceptás las bases")

  const sinInstagram = await request.post("/api/participacion-gratuita", {
    multipart: { ...datos, instagram: "", sigueCanalWhatsapp: "true", aceptaBases: "true" },
  })
  expect(sinInstagram.status()).toBe(400)
  expect((await sinInstagram.json()).error).toContain("Ingresá tu usuario de Instagram")

  const sinCaptura = await request.post("/api/participacion-gratuita", {
    multipart: { ...datos, sigueCanalWhatsapp: "true", aceptaBases: "true" },
  })
  expect(sinCaptura.status()).toBe(400)
  expect((await sinCaptura.json()).error).toContain("Falta la captura")

  const capturaInvalida = await request.post("/api/participacion-gratuita", {
    multipart: {
      ...datos, sigueCanalWhatsapp: "true", aceptaBases: "true",
      captura_agustinsosamotoss: { name: "captura.txt", mimeType: "text/plain", buffer: Buffer.from("no es una imagen") },
    },
  })
  expect(capturaInvalida.status()).toBe(400)
  expect((await capturaInvalida.json()).error).toContain("deben ser imágenes")
})
