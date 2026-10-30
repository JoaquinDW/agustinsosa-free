// Textos que ve el participante. Se guarda en la base el texto exacto que
// aceptó, así que si se cambian, los leads anteriores conservan el suyo.
export const CONSENTIMIENTO_EMAIL =
  "Quiero recibir por email novedades y promociones de Agustín Sosa."
export const CONSENTIMIENTO_WHATSAPP =
  "Quiero recibir por WhatsApp novedades y promociones de Agustín Sosa."

// Cuentas de Instagram que hay que seguir para participar. Cada participante
// sube una captura por cuenta; se guardan en datos_encuesta.capturas_instagram
// con la clave `id`.
export const CUENTAS_INSTAGRAM = [
  {
    id: "agustinsosamotoss",
    nombre: "Agustín Sosa",
    url: "https://www.instagram.com/agustinsosamotoss/",
  },
  {
    id: "sosa.motos.oficial",
    nombre: "Sosa Motos",
    url: "https://www.instagram.com/sosa.motos.oficial/",
  },
] as const

export const TIPOS_CAPTURA: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}
// Mismo límite que el bucket privado "comprobantes" de Supabase.
export const MAX_BYTES_CAPTURA = 5 * 1024 * 1024
