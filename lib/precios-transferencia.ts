import type { Moneda, PaisTransferencia, Sorteo } from "./supabase"

export interface PrecioTransferencia {
  monto: number
  moneda: Moneda
}

// Tope de la compra con cantidad libre: cubre a quien quiera escalar en el
// ranking sin generar pedidos que el backoffice no pueda aprobar de una vez.
export const MAX_CHANCES_PERSONALIZADAS = 1000

export function obtenerPrecioTransferencia(
  sorteo: Sorteo,
  cantidadChances: number,
  pais: PaisTransferencia,
): PrecioTransferencia {
  const precios = [
    {
      cantidad: sorteo.cantidad_pack_1,
      visible: sorteo.pack_1_visible,
      ars: sorteo.precio_6_chances,
      pyg: sorteo.precio_pack_1_pyg,
    },
    {
      cantidad: sorteo.cantidad_pack_2,
      visible: sorteo.pack_2_visible,
      ars: sorteo.precio_12_chances,
      pyg: sorteo.precio_pack_2_pyg,
    },
    {
      cantidad: sorteo.cantidad_pack_3,
      visible: sorteo.pack_3_visible,
      ars: sorteo.precio_24_chances,
      pyg: sorteo.precio_pack_3_pyg,
    },
    {
      cantidad: sorteo.cantidad_pack_4,
      visible: sorteo.pack_4_visible,
      ars: sorteo.precio_pack_4,
      pyg: sorteo.precio_pack_4_pyg,
    },
    {
      cantidad: sorteo.cantidad_pack_5,
      visible: sorteo.pack_5_visible,
      ars: sorteo.precio_pack_5,
      pyg: sorteo.precio_pack_5_pyg,
    },
  ]

  const moneda: Moneda = pais === "PY" ? "PYG" : "ARS"
  const precioDe = (opcion: (typeof precios)[number]) =>
    pais === "PY" ? opcion.pyg : opcion.ars
  const disponibles = precios.filter((opcion) => {
    const monto = precioDe(opcion)
    return (
      opcion.visible &&
      Number.isInteger(opcion.cantidad) &&
      opcion.cantidad > 0 &&
      Number.isFinite(monto) &&
      monto > 0
    )
  })

  if (
    !Number.isInteger(cantidadChances) ||
    cantidadChances < 1 ||
    cantidadChances > MAX_CHANCES_PERSONALIZADAS
  ) {
    throw new Error(`Cantidad de chances no válida: ${cantidadChances}`)
  }

  // Si la cantidad coincide con un pack, se cobra el precio del pack.
  const pack = precios.find(
    (opcion) => opcion.visible && opcion.cantidad === cantidadChances,
  )
  if (pack) {
    const monto = precioDe(pack)
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new Error(`Precio no configurado para ${pais}`)
    }
    return { monto, moneda }
  }

  // Cantidad libre: precio por chance del pack más chico visible (el de 1
  // chance cuando existe), sin descuento por volumen.
  const base = disponibles.reduce<(typeof precios)[number] | null>(
    (menor, opcion) => (!menor || opcion.cantidad < menor.cantidad ? opcion : menor),
    null,
  )
  if (!base) {
    throw new Error(`Precio no configurado para ${pais}`)
  }
  return {
    monto: Math.round((precioDe(base) * cantidadChances) / base.cantidad),
    moneda,
  }
}
