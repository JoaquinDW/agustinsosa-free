import type { EnviarAprobacionParams, EnviarPromoParams, SendWhatsAppResult, WhatsAppProvider } from "./types"
import { normalizarTelefono } from "./normalizar"
import { getWhatsAppBrandConfig, type WhatsAppBrandConfig } from "./config"
import { formatearMonto } from "../moneda"
import { formatearVencimientoPromo } from "./formatear-vencimiento-promo"

// Provider oficial vía Twilio. Corre en Vercel (solo HTTP, sin microservicio).
// Para mensajes iniciados por el negocio, WhatsApp exige una plantilla aprobada:
// en Twilio es un "Content Template" referenciado por ContentSid + ContentVariables.
//
// Las variables se mapean por índice y deben coincidir con el template aprobado:
//   1: nombre        2: marca (WHATSAPP_BRAND_NAME)   3: cantidad de chances
//   4: números       5: total pagado                  6: id del comprobante (suffix del botón URL)
// WhatsApp limita el cuerpo del template a 1024 caracteres. Con compras grandes
// (cantidad libre) la lista completa no entra: mostramos los primeros números y
// el resto queda en el comprobante del botón.
const MAX_LARGO_NUMEROS = 600

export function listarNumerosWhatsApp(numerosAsignados: number[]): string {
  const ordenados = [...numerosAsignados].sort((a, b) => a - b)
  const completa = ordenados.join(",")
  if (completa.length <= MAX_LARGO_NUMEROS) return completa
  let visibles = ordenados.length
  let texto = completa
  do {
    visibles -= 1
    texto = `${ordenados.slice(0, visibles).join(",")} y ${ordenados.length - visibles} más (ver comprobante)`
  } while (texto.length > MAX_LARGO_NUMEROS && visibles > 1)
  return texto
}

export function construirVariablesTemplate(
  params: EnviarAprobacionParams,
  brandName: string,
): Record<"1" | "2" | "3" | "4" | "5" | "6", string> {
  const numeros = listarNumerosWhatsApp(params.numerosAsignados)
  // WhatsApp rechaza variables vacías: si falta algún dato mandamos un guion.
  const monto =
    params.precioPagado != null ? formatearMonto(params.precioPagado, params.moneda || "ARS") : "-"

  return {
    "1": params.nombre?.trim() || "-",
    "2": brandName,
    "3": String(params.cantidadChances),
    "4": numeros || "-",
    "5": monto,
    "6": params.compradorId,
  }
}

export function construirVariablesPromo(params: EnviarPromoParams, brandName: string): Record<"1" | "2" | "3" | "4" | "5" | "6", string> {
  return {
    "1": params.nombre.trim().split(/\s+/)[0] || "-",
    "2": brandName.trim() || "-",
    "3": String(params.cantidadChances || "-"),
    "4": `${params.porcentaje}%`,
    "5": formatearVencimientoPromo(params.venceAt),
    "6": params.codigo.trim() || "-",
  }
}

export class TwilioProvider implements WhatsAppProvider {
  private readonly config: WhatsAppBrandConfig

  constructor(config: WhatsAppBrandConfig = getWhatsAppBrandConfig()) {
    this.config = config
  }

  async enviarTransferenciaAprobada(params: EnviarAprobacionParams): Promise<SendWhatsAppResult> {
    return this.enviarTemplate({
      telefono: params.telefono, pais: params.pais, contentSid: this.config.contentSid,
      variables: construirVariablesTemplate(params, this.config.brandName),
      missingConfigMessage: "Faltan credenciales de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_API_KEY_SID/SECRET, TWILIO_WHATSAPP_FROM, TWILIO_CONTENT_SID)",
    })
  }

  async enviarPromo(params: EnviarPromoParams): Promise<SendWhatsAppResult> {
    const conPremios = Boolean(params.premiosResumen && this.config.contentSidPromoRanking)
    return this.enviarTemplate({
      telefono: params.telefono, pais: params.pais, contentSid: conPremios ? this.config.contentSidPromoRanking || "" : this.config.contentSidPromo || "",
      variables: conPremios
        ? { ...construirVariablesPromo(params, this.config.brandName), "7": params.premiosResumen! }
        : construirVariablesPromo(params, this.config.brandName),
      statusCallback: params.envioId && this.config.webhookAuthToken && this.config.statusCallbackUrl
        ? `${this.config.statusCallbackUrl}?envioId=${encodeURIComponent(params.envioId)}` : undefined,
      missingConfigMessage: "Falta TWILIO_CONTENT_SID_PROMO o las credenciales de Twilio",
    })
  }

  async enviarTemplate(params: {
    telefono: string
    pais?: EnviarPromoParams["pais"]
    contentSid: string
    variables: Record<string, string>
    statusCallback?: string
    missingConfigMessage?: string
  }): Promise<SendWhatsAppResult> {
    const { accountSid, apiKeySid, authToken, from } = this.config

    if (!accountSid || !authToken || !from || !params.contentSid) {
      return {
        success: false,
        provider: "twilio",
        error: params.missingConfigMessage || "Faltan credenciales de Twilio",
      }
    }

    const numero = normalizarTelefono(params.telefono, params.pais)
    if (!numero) {
      return { success: false, provider: "twilio", error: `Teléfono inválido: ${params.telefono}` }
    }

    const body = new URLSearchParams({
      To: `whatsapp:+${numero}`,
      ContentSid: params.contentSid,
      ContentVariables: JSON.stringify(params.variables),
    })
    if (params.statusCallback) body.set("StatusCallback", params.statusCallback)

    // El remitente puede ser un número (`whatsapp:+...`) o un Messaging Service SID (`MG...`).
    if (from.startsWith("MG")) {
      body.set("MessagingServiceSid", from)
    } else {
      body.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`)
    }

    const usuario = apiKeySid || accountSid

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${usuario}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      )

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        return {
          success: false,
          provider: "twilio",
          error: json?.message || `Twilio respondió ${res.status}`,
        }
      }

      return { success: true, provider: "twilio", providerMessageId: json?.sid }
    } catch (error) {
      return {
        success: false,
        provider: "twilio",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
