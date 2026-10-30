import { TwilioProvider } from "./twilio-provider"
import type { WhatsAppBrandConfig } from "./config"
import type { WhatsAppProvider } from "./types"

// Factory: devuelve la implementación del provider de WhatsApp. Hoy solo
// existe Twilio; si se agrega otro, se elige acá (p. ej. por env var) sin
// tocar el resto del código.
export function getWhatsAppProvider(config?: WhatsAppBrandConfig): WhatsAppProvider {
  return new TwilioProvider(config)
}

export type {
  WhatsAppProvider,
  EnviarAprobacionParams,
  EnviarPromoParams,
  SendWhatsAppResult,
  MensajeAprobacionData,
  WhatsAppProviderName,
} from "./types"
export { normalizarTelefono, esNumeroTelefono } from "./normalizar"
export { getWhatsAppBrandConfig, construirUrlComprobante } from "./config"
export type { WhatsAppBrandConfig } from "./config"
export { construirVariablesTemplate, construirVariablesPromo } from "./twilio-provider"
