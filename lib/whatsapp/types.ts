// Interfaz común para los proveedores de envío de WhatsApp.
// El resto de la app solo conoce esta interfaz; la implementación concreta
// (Twilio) vive detrás del factory en index.ts.
import type { Moneda, PaisTransferencia } from "../supabase"

/** Datos necesarios para el mensaje de transferencia aprobada. */
export interface MensajeAprobacionData {
  nombre: string
  cantidadChances: number
  numerosAsignados: number[]
  precioPagado: number
  moneda?: Moneda
  /** Solo informativo: el template usa la marca en {{2}}, no el sorteo. */
  nombreSorteo?: string
  /** Link público a la página del comprobante. */
  comprobanteUrl: string
  /** Id del comprador (usado como suffix del botón/link en plantillas). */
  compradorId: string
}

export interface EnviarAprobacionParams extends MensajeAprobacionData {
  /** Teléfono tal como viene del comprador (sin normalizar). */
  telefono: string
  /** País de la transferencia; define el código de país por defecto. */
  pais?: PaisTransferencia | null
}

export interface EnviarPromoParams {
  envioId?: string
  telefono: string
  pais?: PaisTransferencia | null
  nombre: string
  cantidadChances: number
  porcentaje: number
  venceAt: string
  codigo: string
  premiosResumen?: string
}

export type WhatsAppProviderName = "twilio"

export interface SendWhatsAppResult {
  success: boolean
  error?: string
  provider: WhatsAppProviderName
  /** Identificador del mensaje en el proveedor (ej. sid de Twilio). */
  providerMessageId?: string
}

export interface WhatsAppProvider {
  enviarTransferenciaAprobada(params: EnviarAprobacionParams): Promise<SendWhatsAppResult>
  enviarPromo(params: EnviarPromoParams): Promise<SendWhatsAppResult>
}
