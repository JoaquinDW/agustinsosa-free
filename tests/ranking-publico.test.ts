import assert from "node:assert/strict"
import test from "node:test"
import { anonimizarNombreRanking, prepararRankingPublico } from "../lib/ranking-publico"

test("abrevia nombre y apellido sin publicar el nombre completo", () => {
  assert.equal(anonimizarNombreRanking("  MATÍAS   KOWALSKI  "), "Matías K.")
  assert.equal(anonimizarNombreRanking("María José Pérez"), "María P.")
  assert.equal(anonimizarNombreRanking("Ana"), "Ana")
})

test("no publica correos, teléfonos ni identificadores como nombres", () => {
  assert.equal(anonimizarNombreRanking("matias@example.com"), "Participante")
  assert.equal(anonimizarNombreRanking("+54 9 11 1234 5678"), "Participante")
  assert.equal(anonimizarNombreRanking(null), "Participante")
})

test("el resultado público solo contiene puesto, nombre abreviado y chances", () => {
  const filas = [{ nombre: "Matías Kowalski", chances: 600, email: "m@example.com", telefono: "5491112345678" }]
  assert.deepEqual(prepararRankingPublico(filas), [{ puesto: 1, nombre: "Matías K.", chances: 600 }])
})
