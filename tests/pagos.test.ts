import assert from "node:assert/strict"
import { test } from "node:test"
import { POST as crearPreferencia } from "../app/api/crear-preferencia/route"
import { POST as registrarMercadoPago } from "../app/api/mercadopago/route"
import { POST as confirmarPago } from "../app/api/confirmar-pago/route"

for (const [ruta, handler] of [
  ["/api/crear-preferencia", crearPreferencia],
  ["/api/mercadopago", registrarMercadoPago],
  ["/api/confirmar-pago", confirmarPago],
] as const) {
  test(`${ruta} permanece deshabilitada`, async () => {
    const response = await handler()
    assert.equal(response.status, 410)
    assert.deepEqual(await response.json(), {
      error: "Solo se acepta transferencia bancaria",
    })
  })
}
