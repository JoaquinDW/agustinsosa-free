import type { PaisTransferencia } from "../supabase"

// Normaliza un teléfono al formato internacional que WhatsApp espera
// (sin +, sin separadores):
//   AR: 549 + código de área + número (10 dígitos nacionales)
//   PY: 595 + número sin el 0 inicial (9 dígitos nacionales, ej. 981123456)
// Si el número ya trae código de país (54 / 595) se respeta ese, aunque `pais`
// diga otra cosa. Devuelve null si no parece válido.
export function normalizarTelefono(
  input: string | undefined | null,
  pais: PaisTransferencia | null | undefined = "AR",
): string | null {
  if (!esNumeroTelefono(input)) return null
  let d = (input || "").replace(/\D/g, "")
  if (!d) return null

  // Prefijo internacional 00
  if (d.startsWith("00")) d = d.slice(2)

  if (d.startsWith("595")) return normalizarNacionalPY(d.slice(3))
  if (d.startsWith("54")) return normalizarNacionalAR(d.slice(d.startsWith("549") ? 3 : 2))

  return pais === "PY" ? normalizarNacionalPY(d) : normalizarNacionalAR(d)
}

function normalizarNacionalAR(d: string): string | null {
  // 0 inicial de larga distancia nacional
  if (d.startsWith("0")) d = d.slice(1)

  // El número nacional argentino (área + abonado) tiene 10 dígitos.
  // Aceptamos 10-11 para tolerar casos con un dígito extra; fuera de ese
  // rango lo consideramos inválido (probablemente un usuario de Instagram
  // guardado en el campo telefono, o un número incompleto).
  if (d.length < 10 || d.length > 11) return null

  return "549" + d
}

function normalizarNacionalPY(d: string): string | null {
  if (d.startsWith("0")) d = d.slice(1)

  // Número nacional paraguayo sin el 0: 9 dígitos para móviles (9XXXXXXXX).
  // Toleramos 8-9 para fijos/casos raros.
  if (d.length < 8 || d.length > 9) return null

  return "595" + d
}

/**
 * Heurística para decidir si el valor del campo `telefono` es realmente un
 * número (y no un usuario de Instagram guardado ahí por compatibilidad).
 */
export function esNumeroTelefono(valor: string | undefined | null): boolean {
  if (!valor) return false
  return /^[\d\s+()-]+$/.test(valor)
}
