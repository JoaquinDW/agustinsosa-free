import assert from "node:assert/strict"
import { test } from "node:test"
import { aplicarDescuento, generarCodigoPromo, packAplica, precioConPromo, validarCodigo } from "../lib/promos"
import type { Sorteo } from "../lib/supabase"
import { MAX_CHANCES_PERSONALIZADAS, obtenerPrecioTransferencia } from "../lib/precios-transferencia"

const campania = {
  sorteo_id: "sorteo-1",
  porcentaje: 30,
  packs_aplicables: [12, 24],
  usos: "unico" as const,
  vence_at: "2026-10-10T00:00:00.000Z",
}
const codigo = { id: "1", codigo: "K7Q2M9XA", campania_id: "1", usos_confirmados: 0 }

test("genera códigos de 8 caracteres sin símbolos ambiguos", () => {
  const valores = Array.from({ length: 100 }, generarCodigoPromo)
  assert.equal(new Set(valores).size, valores.length)
  valores.forEach((valor) => assert.match(valor, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/))
})

test("redondea el descuento al entero para ARS y PYG", () => {
  assert.equal(aplicarDescuento(1001, 30), 701)
  assert.equal(aplicarDescuento(999, 50), 500)
  assert.throws(() => aplicarDescuento(1000, 0))
})

test("valida vencimiento, sorteo, uso y pack", () => {
  const ahora = new Date("2026-10-09T00:00:00.000Z")
  assert.deepEqual(validarCodigo(codigo, campania, ahora, "sorteo-1", 12), { ok: true })
  assert.deepEqual(validarCodigo(null, campania, ahora), { ok: false, motivo: "no_existe" })
  assert.deepEqual(validarCodigo(codigo, campania, ahora, "otro"), { ok: false, motivo: "otro_sorteo" })
  assert.deepEqual(validarCodigo(codigo, campania, ahora, "sorteo-1", 6), { ok: false, motivo: "pack_no_aplica" })
  assert.deepEqual(validarCodigo({ ...codigo, usos_confirmados: 1 }, campania, ahora), { ok: false, motivo: "usado" })
  assert.deepEqual(validarCodigo(codigo, campania, new Date("2026-10-10T00:00:00.000Z")), { ok: false, motivo: "vencido" })
  assert.equal(packAplica({ packs_aplicables: null }, 6), true)
})

// Mercado Pago deshabilitado: prueba del webhook comentada.
// test("webhook acepta monto de lista y monto promocional sin revalidar vencimiento", () => {
//   const sorteo = {
//     id: "sorteo-1", cantidad_pack_1: 6, precio_6_chances: 1001, pack_1_visible: true,
//     cantidad_pack_2: 12, precio_12_chances: 2000, pack_2_visible: true,
//     cantidad_pack_3: 24, precio_24_chances: 4000, pack_3_visible: false,
//     cantidad_pack_4: 0, precio_pack_4: 0, pack_4_visible: false,
//     cantidad_pack_5: 0, precio_pack_5: 0, pack_5_visible: false,
//   } as Sorteo
//   const promo = { ...codigo, campania: { ...campania, packs_aplicables: [6], vence_at: "2020-01-01T00:00:00Z" } }
//   assert.equal(encontrarPackPago(sorteo, 1001, 6, "", null)?.chances, 6)
//   assert.equal(encontrarPackPago(sorteo, 701, 6, codigo.codigo, promo)?.chances, 6)
//   assert.equal(encontrarPackPago(sorteo, 701, 6, codigo.codigo, null, 1001, 30)?.chances, 6)
//   assert.equal(encontrarPackPago(sorteo, 700, 6, codigo.codigo, promo), null)
//   assert.equal(encontrarPackPago(sorteo, 4000, 24, "", null), null)
// })
//

test("calcula el precio promocional en ARS y PYG desde el sorteo", () => {
  const sorteo = {
    cantidad_pack_1: 6, precio_6_chances: 1001, precio_pack_1_pyg: 10001, pack_1_visible: true,
    cantidad_pack_2: 12, precio_12_chances: 2000, precio_pack_2_pyg: 20000, pack_2_visible: true,
    cantidad_pack_3: 24, precio_24_chances: 4000, precio_pack_3_pyg: 40000, pack_3_visible: true,
    cantidad_pack_4: 0, precio_pack_4: 0, precio_pack_4_pyg: 0, pack_4_visible: false,
    cantidad_pack_5: 0, precio_pack_5: 0, precio_pack_5_pyg: 0, pack_5_visible: false,
  } as Sorteo
  assert.deepEqual(precioConPromo(sorteo, 6, "AR", campania), { lista: 1001, final: 701, moneda: "ARS" })
  assert.deepEqual(precioConPromo(sorteo, 6, "PY", campania), { lista: 10001, final: 7001, moneda: "PYG" })
})

test("cantidad libre: usa el precio del pack si coincide y el precio por chance si no", () => {
  const sorteo = {
    cantidad_pack_1: 1, precio_6_chances: 5000, precio_pack_1_pyg: 10000, pack_1_visible: true,
    cantidad_pack_2: 3, precio_12_chances: 10000, precio_pack_2_pyg: 20000, pack_2_visible: true,
    cantidad_pack_3: 8, precio_24_chances: 20000, precio_pack_3_pyg: 30000, pack_3_visible: true,
    cantidad_pack_4: 0, precio_pack_4: 0, precio_pack_4_pyg: 0, pack_4_visible: false,
    cantidad_pack_5: 0, precio_pack_5: 0, precio_pack_5_pyg: 0, pack_5_visible: false,
  } as unknown as Sorteo
  assert.deepEqual(obtenerPrecioTransferencia(sorteo, 3, "AR"), { monto: 10000, moneda: "ARS" })
  assert.deepEqual(obtenerPrecioTransferencia(sorteo, 37, "AR"), { monto: 185000, moneda: "ARS" })
  assert.deepEqual(obtenerPrecioTransferencia(sorteo, 37, "PY"), { monto: 370000, moneda: "PYG" })
  assert.equal(obtenerPrecioTransferencia(sorteo, MAX_CHANCES_PERSONALIZADAS, "AR").monto, 5000 * MAX_CHANCES_PERSONALIZADAS)
  for (const invalida of [0, -1, 2.5, Number.NaN, MAX_CHANCES_PERSONALIZADAS + 1]) {
    assert.throws(() => obtenerPrecioTransferencia(sorteo, invalida, "AR"))
  }
  const sinPackUnitario = { ...sorteo, pack_1_visible: false } as Sorteo
  assert.equal(obtenerPrecioTransferencia(sinPackUnitario, 6, "AR").monto, 20000)
})
