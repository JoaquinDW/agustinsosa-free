import type { Sorteo } from "@/lib/supabase"

/**
 * Contenido digital descargable asociado a cada pack del sorteo.
 *
 * Cada comprador recibe el archivo del pack que compró. El pack se identifica
 * por su "slot" (1..5), que se resuelve a partir de `cantidad_chances` contra
 * la configuración del sorteo (`cantidad_pack_N`) — la misma lógica que usa
 * La validación de precios de Mercado Pago (`app/api/confirmar-pago/route.ts`) está deshabilitada.
 */
export interface ContenidoPack {
  /** Título legible para mostrar en emails / UI */
  titulo: string
  /** Ruta del archivo dentro del bucket privado `contenido-packs` */
  storagePath: string
  /** Nombre con el que se descarga el archivo */
  filename: string
}

/** Bucket privado de Supabase Storage donde viven los descargables. */
export const BUCKET_CONTENIDO = "contenido-packs"

const EBOOK_INSTAGRAM: ContenidoPack = {
  titulo: "Ebook: Los secretos de Instagram",
  storagePath: "ebook-instagram.pdf",
  filename: "Ebook-Los-secretos-de-instagram.pdf",
}

const GUIA_PREMIUM: ContenidoPack = {
  titulo: "Guía Premium Sosa Motos",
  storagePath: "guia-premium.pdf",
  filename: "Guia_Premium_Sosa_Motos.pdf",
}

const PACK_CALCOS: ContenidoPack = {
  titulo: "Pack de Calcos Digitales",
  storagePath: "calcos-digitales.zip",
  filename: "Sosa_Motos_Pack_Calcos_Digitales.zip",
}

/**
 * Mapeo slot de pack -> contenidos descargables. Un slot puede entregar varios
 * archivos: el pack 4 incluye TODO el contenido digital (ebook + guía + calcos).
 */
const CONTENIDO_POR_SLOT: Record<number, ContenidoPack[]> = {
  1: [EBOOK_INSTAGRAM],
  2: [GUIA_PREMIUM],
  3: [PACK_CALCOS],
  4: [EBOOK_INSTAGRAM, GUIA_PREMIUM, PACK_CALCOS],
}

/**
 * Resuelve el slot de pack (1..5) a partir de la cantidad de chances comprada.
 * Devuelve `null` si no coincide con ningún pack configurado.
 */
export function resolverSlotPack(sorteo: Sorteo, chances: number): number | null {
  if (chances === sorteo.cantidad_pack_1) return 1
  if (chances === sorteo.cantidad_pack_2) return 2
  if (chances === sorteo.cantidad_pack_3) return 3
  if (sorteo.pack_4_visible && chances === sorteo.cantidad_pack_4) return 4
  if (sorteo.pack_5_visible && chances === sorteo.cantidad_pack_5) return 5
  return null
}

/**
 * Devuelve los contenidos descargables que le corresponden a un comprador según
 * la cantidad de chances que compró. Puede ser más de uno (p. ej. el pack 4
 * entrega ebook + guía + calcos). Array vacío si ese pack no tiene contenido.
 */
export function obtenerContenidosPorChances(
  sorteo: Sorteo,
  chances: number,
): ContenidoPack[] {
  const slot = resolverSlotPack(sorteo, chances)
  if (slot === null) return []
  return CONTENIDO_POR_SLOT[slot] ?? []
}
