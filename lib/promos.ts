import type { PaisTransferencia, Sorteo } from "./supabase"
import { obtenerPrecioTransferencia } from "./precios-transferencia"

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export interface CampaniaPromo {
  sorteo_id: string
  porcentaje: number
  packs_aplicables: number[] | null
  usos: "unico" | "ilimitado"
  vence_at: string
}

export interface CodigoPromo {
  id: string
  codigo: string
  campania_id: string
  usos_confirmados: number
}

export type MotivoPromo = "no_existe" | "vencido" | "usado" | "otro_sorteo" | "pack_no_aplica"

export function generarCodigoPromo(): string {
  const bytes = new Uint8Array(8)
  const limite = Math.floor(256 / ALFABETO.length) * ALFABETO.length
  let codigo = ""
  while (codigo.length < 8) {
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte < limite) codigo += ALFABETO[byte % ALFABETO.length]
      if (codigo.length === 8) break
    }
  }
  return codigo
}

export function aplicarDescuento(monto: number, porcentaje: number): number {
  if (!Number.isFinite(monto) || monto < 0 || !Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 90) {
    throw new Error("Precio o porcentaje de promo inválido")
  }
  return Math.round(monto * (100 - porcentaje) / 100)
}

export function packAplica(campania: Pick<CampaniaPromo, "packs_aplicables">, cantidadChances: number): boolean {
  return campania.packs_aplicables == null || campania.packs_aplicables.includes(cantidadChances)
}

export function validarCodigo(
  codigo: CodigoPromo | null,
  campania: CampaniaPromo | null,
  ahora: Date,
  sorteoId?: string,
  cantidadChances?: number,
): { ok: true } | { ok: false; motivo: MotivoPromo } {
  if (!codigo || !campania) return { ok: false, motivo: "no_existe" }
  if (sorteoId && campania.sorteo_id !== sorteoId) return { ok: false, motivo: "otro_sorteo" }
  if (new Date(campania.vence_at).getTime() <= ahora.getTime()) return { ok: false, motivo: "vencido" }
  if (campania.usos === "unico" && codigo.usos_confirmados > 0) return { ok: false, motivo: "usado" }
  if (cantidadChances != null && !packAplica(campania, cantidadChances)) return { ok: false, motivo: "pack_no_aplica" }
  return { ok: true }
}

export function precioConPromo(
  sorteo: Sorteo,
  cantidadChances: number,
  pais: PaisTransferencia,
  campania: Pick<CampaniaPromo, "porcentaje">,
): { lista: number; final: number; moneda: "ARS" | "PYG" } {
  const precio = obtenerPrecioTransferencia(sorteo, cantidadChances, pais)
  return { lista: precio.monto, final: aplicarDescuento(precio.monto, campania.porcentaje), moneda: precio.moneda }
}

export const MENSAJES_PROMO: Record<MotivoPromo, string> = {
  no_existe: "La promo no existe",
  vencido: "La promo venció",
  usado: "Este código ya fue usado",
  otro_sorteo: "La promo pertenece a otro sorteo",
  pack_no_aplica: "La promo no aplica a este pack",
}

// Mercado Pago deshabilitado permanentemente. Validación del webhook comentada.
// export function encontrarPackPago(
//   sorteo: Sorteo,
//   monto: number,
//   metadataChances: number,
//   promoCodigo: string,
//   promo: (CodigoPromo & { campania: CampaniaPromo }) | null,
//   precioListaMetadata?: number,
//   porcentajeMetadata?: number,
// ): { chances: number; price: number } | null {
//   const packs = [
//     { chances: sorteo.cantidad_pack_1, price: sorteo.precio_6_chances, visible: sorteo.pack_1_visible },
//     { chances: sorteo.cantidad_pack_2, price: sorteo.precio_12_chances, visible: sorteo.pack_2_visible },
//     { chances: sorteo.cantidad_pack_3, price: sorteo.precio_24_chances, visible: sorteo.pack_3_visible },
//     { chances: sorteo.cantidad_pack_4, price: sorteo.precio_pack_4, visible: sorteo.pack_4_visible },
//     { chances: sorteo.cantidad_pack_5, price: sorteo.precio_pack_5, visible: sorteo.pack_5_visible },
//   ]
//   if (!Number.isFinite(monto) || monto <= 0) return null
//   return packs.find((pack) => {
//     if (!pack.visible || (Number.isFinite(metadataChances) && pack.chances !== metadataChances)) return false
//     if (!promoCodigo) return pack.price === monto
//     if (pack.chances !== metadataChances) return false
//     if (promo) return promo.campania.sorteo_id === sorteo.id && packAplica(promo.campania, pack.chances) && aplicarDescuento(pack.price, promo.campania.porcentaje) === monto
//     return precioListaMetadata === pack.price && Number.isInteger(porcentajeMetadata) && porcentajeMetadata! >= 1 && porcentajeMetadata! <= 90 && aplicarDescuento(pack.price, porcentajeMetadata!) === monto
//   }) || null
// }
