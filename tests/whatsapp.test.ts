import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { createHmac } from "node:crypto"
import { construirUrlComprobante, getWhatsAppBrandConfig } from "../lib/whatsapp/config"
import { TwilioProvider, construirVariablesTemplate, construirVariablesPromo, listarNumerosWhatsApp } from "../lib/whatsapp/twilio-provider"
import type { EnviarAprobacionParams } from "../lib/whatsapp/types"
import { validarFirmaTwilio } from "../lib/whatsapp/validar-callback"
import { normalizarTelefono } from "../lib/whatsapp/normalizar"

// Valores de prueba: NO son credenciales reales.
const SOSA_ENV = {
  WHATSAPP_BRAND_NAME: "Agustin Sosa",
  TWILIO_ACCOUNT_SID: "ACsosa0000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "token-sosa",
  TWILIO_WHATSAPP_FROM: "whatsapp:+13527065042",
  TWILIO_CONTENT_SID: "HX59c7af90d72156b7d76be4b8376d89d1",
  WHATSAPP_COMPROBANTE_BASE_URL: "https://www.agustinsosa.com",
}

// Facuregalos corre en su propio deploy con su propio env. Simulamos ese env
// para verificar que el provider usa lo que recibe y no mezcla marcas.
const FACU_ENV = {
  WHATSAPP_BRAND_NAME: "Facuregalos",
  TWILIO_ACCOUNT_SID: "ACfacu0000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "token-facu",
  TWILIO_WHATSAPP_FROM: "whatsapp:+15550001111",
  TWILIO_CONTENT_SID: "HXfacu00000000000000000000000000",
  WHATSAPP_COMPROBANTE_BASE_URL: "https://facuregalos.com",
}

const PARAMS: EnviarAprobacionParams = {
  telefono: "3794 123456",
  pais: "AR",
  nombre: "pepe",
  cantidadChances: 5,
  numerosAsignados: [75, 1, 4],
  precioPagado: 2000,
  moneda: "ARS",
  nombreSorteo: "Moto 0km",
  comprobanteUrl: "https://www.agustinsosa.com/comprobante/abc123",
  compradorId: "abc123",
}

type Captured = { url: string; headers: Record<string, string>; body: URLSearchParams }

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockTwilio(): Captured[] {
  const calls: Captured[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({
      url: String(url),
      headers: init.headers as Record<string, string>,
      body: new URLSearchParams(String(init.body)),
    })
    return new Response(JSON.stringify({ sid: "SMtest" }), { status: 201 })
  }) as typeof fetch
  return calls
}

test("genera la URL del comprobante", () => {
  assert.equal(
    construirUrlComprobante("https://www.agustinsosa.com", "abc123"),
    "https://www.agustinsosa.com/comprobante/abc123",
  )
  assert.equal(
    construirUrlComprobante("https://www.agustinsosa.com/", "abc123"),
    "https://www.agustinsosa.com/comprobante/abc123",
  )
  const config = getWhatsAppBrandConfig({})
  assert.equal(
    construirUrlComprobante(config.comprobanteBaseUrl, "abc123"),
    "https://www.agustinsosa.com/comprobante/abc123",
  )
})

test("normaliza el mismo teléfono aunque cambie el formato y rechaza contactos inválidos", () => {
  assert.equal(normalizarTelefono("379 515 2063", "AR"), "5493795152063")
  assert.equal(normalizarTelefono("+54 9 379 515 2063", "AR"), "5493795152063")
  assert.equal(normalizarTelefono("0981 123 456", "PY"), "595981123456")
  assert.equal(normalizarTelefono("+595 981 123 456", "PY"), "595981123456")
  assert.equal(normalizarTelefono("@instagram 3795152063", "AR"), null)
  assert.equal(normalizarTelefono("", "AR"), null)
})

test("arma las seis variables del template", () => {
  assert.deepEqual(construirVariablesTemplate(PARAMS, "Agustin Sosa"), {
    "1": "pepe",
    "2": "Agustin Sosa",
    "3": "5",
    "4": "1,4,75",
    "5": "AR$ 2.000",
    "6": "abc123",
  })
})

test("ninguna variable queda vacía (WhatsApp las rechaza)", () => {
  const vars = construirVariablesTemplate(
    { ...PARAMS, nombre: " ", numerosAsignados: [] },
    "Agustin Sosa",
  )
  for (const [k, v] of Object.entries(vars)) assert.ok(v.length > 0, `variable ${k} vacía`)
})

test("recorta la lista de números de compras grandes para respetar el límite de WhatsApp", () => {
  const numeros = Array.from({ length: 1000 }, (_, i) => 10000 + i)
  const texto = listarNumerosWhatsApp(numeros)
  assert.ok(texto.length <= 600)
  assert.match(texto, /^10000,10001,.* y \d+ más \(ver comprobante\)$/)
  assert.equal(listarNumerosWhatsApp([75, 1, 4]), "1,4,75")
})

test("promo usa seis variables y fecha en hora argentina", () => {
  const variables = construirVariablesPromo({
    telefono: "3794123456", nombre: "Leopoldo Pérez", cantidadChances: 600,
    porcentaje: 30, venceAt: "2026-10-10T02:59:00.000Z", codigo: "K7Q2M9XA",
  }, "Agustin Sosa")
  assert.deepEqual(variables, {
    "1": "Leopoldo", "2": "Agustin Sosa", "3": "600", "4": "30%",
    "5": "09/10 a las 23:59", "6": "K7Q2M9XA",
  })
})

test("sin SID de promo falla claramente sin afectar transferencia", async () => {
  const calls = mockTwilio()
  const provider = new TwilioProvider(getWhatsAppBrandConfig(SOSA_ENV))
  const promo = await provider.enviarPromo({ telefono: "3794123456", nombre: "Pepe", cantidadChances: 5, porcentaje: 30, venceAt: "2026-10-10T02:59:00.000Z", codigo: "K7Q2M9XA" })
  assert.equal(promo.success, false)
  assert.match(promo.error || "", /TWILIO_CONTENT_SID_PROMO/)
  assert.equal(calls.length, 0)
  const transferencia = await provider.enviarTransferenciaAprobada(PARAMS)
  assert.equal(transferencia.success, true)
})

test("envío de promo usa el SID Marketing configurado", async () => {
  const calls = mockTwilio()
  const provider = new TwilioProvider(getWhatsAppBrandConfig({ ...SOSA_ENV, TWILIO_CONTENT_SID_PROMO: "HXpromo00000000000000000000000000" }))
  const result = await provider.enviarPromo({ telefono: "3794123456", nombre: "Pepe", cantidadChances: 5, porcentaje: 30, venceAt: "2026-10-10T02:59:00.000Z", codigo: "K7Q2M9XA" })
  assert.equal(result.success, true)
  assert.equal(calls[0].body.get("ContentSid"), "HXpromo00000000000000000000000000")
  assert.equal(JSON.parse(calls[0].body.get("ContentVariables") || "{}")["6"], "K7Q2M9XA")
})

test("promo de ranking usa plantilla y séptima variable cuando hay tres premios", async () => {
  const calls = mockTwilio()
  const provider = new TwilioProvider(getWhatsAppBrandConfig({ ...SOSA_ENV,
    TWILIO_CONTENT_SID_PROMO: "HXpromo00000000000000000000000000",
    TWILIO_CONTENT_SID_PROMO_RANKING: "HXranking000000000000000000000000",
  }))
  const result = await provider.enviarPromo({ telefono: "3794123456", nombre: "Pepe", cantidadChances: 5, porcentaje: 30,
    venceAt: "2026-10-10T02:59:00.000Z", codigo: "K7Q2M9XA", premiosResumen: "1° Moto · 2° Casco · 3° Campera" })
  assert.equal(result.success, true)
  assert.equal(calls[0].body.get("ContentSid"), "HXranking000000000000000000000000")
  const variables = JSON.parse(calls[0].body.get("ContentVariables") || "{}")
  assert.equal(variables["6"], "K7Q2M9XA")
  assert.equal(variables["7"], "1° Moto · 2° Casco · 3° Campera")
})

test("sin plantilla de ranking conserva el envío de promo aprobado", async () => {
  const calls = mockTwilio()
  const provider = new TwilioProvider(getWhatsAppBrandConfig({ ...SOSA_ENV,
    TWILIO_CONTENT_SID_PROMO: "HXpromo00000000000000000000000000",
  }))
  await provider.enviarPromo({ telefono: "3794123456", nombre: "Pepe", cantidadChances: 5, porcentaje: 30,
    venceAt: "2026-10-10T02:59:00.000Z", codigo: "K7Q2M9XA", premiosResumen: "1° Moto · 2° Casco · 3° Campera" })
  assert.equal(calls[0].body.get("ContentSid"), "HXpromo00000000000000000000000000")
  assert.equal(JSON.parse(calls[0].body.get("ContentVariables") || "{}")["7"], undefined)
})

test("promo configura callback firmado para conocer entregas", async () => {
  const calls = mockTwilio()
  const provider = new TwilioProvider(getWhatsAppBrandConfig({ ...SOSA_ENV,
    NEXT_PUBLIC_APP_URL: "https://www.agustinsosa.com",
    TWILIO_CONTENT_SID_PROMO: "HXpromo00000000000000000000000000",
  }))
  await provider.enviarPromo({ envioId: "envio-1", telefono: "3794123456", nombre: "Pepe", cantidadChances: 5, porcentaje: 30, venceAt: "2026-10-10T02:59:00.000Z", codigo: "K7Q2M9XA" })
  assert.equal(calls[0].body.get("StatusCallback"), "https://www.agustinsosa.com/api/whatsapp-status?envioId=envio-1")
})

test("rechaza firmas alteradas y acepta campos nuevos en callback", () => {
  const url = "https://www.agustinsosa.com/api/whatsapp-status?envioId=envio-1"
  const campos = new URLSearchParams({ MessageSid: "SMtest", MessageStatus: "delivered", ChannelStatusMessage: "ok" })
  const texto = url + [...campos.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => k + v).join("")
  const firma = createHmac("sha1", "token-sosa").update(texto).digest("base64")
  assert.equal(validarFirmaTwilio(url, campos, firma, "token-sosa"), true)
  assert.equal(validarFirmaTwilio(url, campos, firma, "otro-token"), false)
  campos.set("MessageStatus", "failed")
  assert.equal(validarFirmaTwilio(url, campos, firma, "token-sosa"), false)
})

test("Agustin Sosa envía con su sender, Content SID y las seis variables", async () => {
  const calls = mockTwilio()
  const provider = new TwilioProvider(getWhatsAppBrandConfig(SOSA_ENV))
  const result = await provider.enviarTransferenciaAprobada(PARAMS)

  assert.equal(result.success, true)
  assert.equal(result.providerMessageId, "SMtest")
  assert.equal(calls.length, 1)
  const [call] = calls
  assert.equal(
    call.url,
    `https://api.twilio.com/2010-04-01/Accounts/${SOSA_ENV.TWILIO_ACCOUNT_SID}/Messages.json`,
  )
  assert.equal(call.body.get("From"), "whatsapp:+13527065042")
  assert.equal(call.body.get("ContentSid"), "HX59c7af90d72156b7d76be4b8376d89d1")
  assert.equal(call.body.get("To"), "whatsapp:+5493794123456")
  assert.deepEqual(JSON.parse(call.body.get("ContentVariables")!), {
    "1": "pepe",
    "2": "Agustin Sosa",
    "3": "5",
    "4": "1,4,75",
    "5": "AR$ 2.000",
    "6": "abc123",
  })
})

test("Facuregalos sigue usando su propio sender y template", async () => {
  const calls = mockTwilio()
  await new TwilioProvider(getWhatsAppBrandConfig(SOSA_ENV)).enviarTransferenciaAprobada(PARAMS)
  await new TwilioProvider(getWhatsAppBrandConfig(FACU_ENV)).enviarTransferenciaAprobada(PARAMS)

  const [sosa, facu] = calls
  assert.equal(facu.body.get("From"), FACU_ENV.TWILIO_WHATSAPP_FROM)
  assert.equal(facu.body.get("ContentSid"), FACU_ENV.TWILIO_CONTENT_SID)
  assert.ok(facu.url.includes(FACU_ENV.TWILIO_ACCOUNT_SID))
  assert.equal(JSON.parse(facu.body.get("ContentVariables")!)["2"], "Facuregalos")

  assert.notEqual(facu.body.get("From"), sosa.body.get("From"))
  assert.notEqual(facu.body.get("ContentSid"), sosa.body.get("ContentSid"))
  assert.notEqual(facu.headers.Authorization, sosa.headers.Authorization)
})

test("autentica con API Key si está configurada", async () => {
  const calls = mockTwilio()
  const config = getWhatsAppBrandConfig({
    ...SOSA_ENV,
    TWILIO_AUTH_TOKEN: undefined,
    TWILIO_API_KEY_SID: "SKtest",
    TWILIO_API_KEY_SECRET: "secret",
  })
  await new TwilioProvider(config).enviarTransferenciaAprobada(PARAMS)
  assert.equal(
    calls[0].headers.Authorization,
    `Basic ${Buffer.from("SKtest:secret").toString("base64")}`,
  )
  assert.ok(calls[0].url.includes(SOSA_ENV.TWILIO_ACCOUNT_SID))
})

test("sin credenciales no llama a Twilio", async () => {
  const calls = mockTwilio()
  const result = await new TwilioProvider(getWhatsAppBrandConfig({})).enviarTransferenciaAprobada(
    PARAMS,
  )
  assert.equal(result.success, false)
  assert.equal(calls.length, 0)
})
