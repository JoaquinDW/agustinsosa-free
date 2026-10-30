import { createHmac, timingSafeEqual } from "node:crypto"

// Twilio firma la URL exacta y todos los campos del formulario ordenados.
export function validarFirmaTwilio(url: string, campos: URLSearchParams, firma: string, authToken: string): boolean {
  if (!firma || !authToken) return false
  const contenido = url + [...campos.entries()]
    .sort(([claveA, valorA], [claveB, valorB]) => claveA < claveB ? -1 : claveA > claveB ? 1 : valorA < valorB ? -1 : valorA > valorB ? 1 : 0)
    .map(([clave, valor]) => clave + valor).join("")
  const esperado = createHmac("sha1", authToken).update(contenido).digest("base64")
  const a = Buffer.from(firma)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}
