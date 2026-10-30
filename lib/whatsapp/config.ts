// Configuración de WhatsApp por marca. Todo sale de variables de entorno del
// deploy (cada negocio —Agustin Sosa, Facuregalos— tiene su propio proyecto en
// Vercel con su propio sender y template). No hay credenciales en el código.

export interface WhatsAppBrandConfig {
  /** Valor de {{2}} en el template ("Tu transferencia para {{2}} fue aprobada"). */
  brandName: string
  accountSid: string
  /** Auth Token de la cuenta, o secret de la API Key si se usa apiKeySid. */
  authToken: string
  /** API Key SID (SK...) opcional; si está, se autentica con apiKeySid:authToken. */
  apiKeySid?: string
  /** `whatsapp:+E164` o Messaging Service SID (`MG...`). */
  from: string
  /** Content SID (HX...) del template aprobado. */
  contentSid: string
  contentSidPromo?: string
  contentSidPromoRanking?: string
  /** Auth Token de la cuenta para validar callbacks, aun si el envío usa API Key. */
  webhookAuthToken?: string
  statusCallbackUrl?: string
  /** Base pública del comprobante (el botón del template apunta a <base>/comprobante/{{6}}). */
  comprobanteBaseUrl: string
}

const DEFAULT_BRAND_NAME = "Agustin Sosa"
const DEFAULT_COMPROBANTE_BASE_URL = "https://www.agustinsosa.com"

type Env = Record<string, string | undefined>

export function getWhatsAppBrandConfig(env: Env = process.env): WhatsAppBrandConfig {
  return {
    brandName: env.WHATSAPP_BRAND_NAME?.trim() || DEFAULT_BRAND_NAME,
    accountSid: env.TWILIO_ACCOUNT_SID || "",
    apiKeySid: env.TWILIO_API_KEY_SID || undefined,
    authToken: env.TWILIO_API_KEY_SID ? env.TWILIO_API_KEY_SECRET || "" : env.TWILIO_AUTH_TOKEN || "",
    from: env.TWILIO_WHATSAPP_FROM || "",
    contentSid: env.TWILIO_CONTENT_SID || "",
    contentSidPromo: env.TWILIO_CONTENT_SID_PROMO || "",
    contentSidPromoRanking: env.TWILIO_CONTENT_SID_PROMO_RANKING || "",
    webhookAuthToken: env.TWILIO_AUTH_TOKEN || "",
    statusCallbackUrl: env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
      ? `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/api/whatsapp-status`
      : undefined,
    comprobanteBaseUrl:
      env.WHATSAPP_COMPROBANTE_BASE_URL || env.NEXT_PUBLIC_APP_URL || DEFAULT_COMPROBANTE_BASE_URL,
  }
}

export function construirUrlComprobante(baseUrl: string, comprobanteId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/comprobante/${encodeURIComponent(comprobanteId)}`
}
