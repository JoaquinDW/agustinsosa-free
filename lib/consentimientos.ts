// Textos que ve el participante. Se guarda en la base el texto exacto que
// aceptó, así que si se cambian, los leads anteriores conservan el suyo.
// Una sola casilla cubre ambos canales (email y WhatsApp).
export const CONSENTIMIENTO_NOVEDADES =
  "Quiero recibir por email y WhatsApp novedades y promociones de Agustín Sosa."

export const CANAL_WHATSAPP_URL = "https://whatsapp.com/channel/0029VaB9bCi6GcGLs2JEvM12"

// Se conserva el listado histórico para abrir capturas de inscripciones anteriores.
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

// Única cuenta requerida para las nuevas participaciones.
export const CUENTA_INSTAGRAM_REQUERIDA = CUENTAS_INSTAGRAM[0]

// Temporalmente no se pide comprobante: el requisito de seguir en Instagram continúa.
// Compartido entre formulario y API para permitir la inscripción sin adjuntos.
export const SOLICITAR_CAPTURA_INSTAGRAM = false

export const TIPOS_CAPTURA: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}
// Mismo límite que el bucket privado "comprobantes" de Supabase.
export const MAX_BYTES_CAPTURA = 5 * 1024 * 1024

// Usuario de Instagram del participante: acepta "@usuario", "usuario" o el
// link al perfil. Devuelve el usuario en minúscula sin "@", o null si no es
// válido (Instagram permite letras, números, punto y guion bajo, hasta 30).
export function normalizarInstagram(valor: string | null | undefined): string | null {
  const usuario = (valor || "")
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .toLowerCase()
  return /^[a-z0-9._]{1,30}$/.test(usuario) ? usuario : null
}
