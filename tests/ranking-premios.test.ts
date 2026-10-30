import assert from "node:assert/strict"
import { test } from "node:test"
import { publicarResultadoRanking, resumenPremiosRanking, validarPremiosRanking } from "../lib/ranking-premios"

test("premios se ordenan por puesto y sirven para el resumen de campaña", () => {
  const premios = validarPremiosRanking([
    { puesto: 3, titulo: "Campera", descripcion: "", imagenUrl: "" },
    { puesto: 1, titulo: " Moto ", descripcion: "", imagenUrl: "" },
    { puesto: 2, titulo: "Casco", descripcion: "", imagenUrl: "" },
  ])
  assert.deepEqual(premios.map((premio) => premio.puesto), [1, 2, 3])
  assert.deepEqual(premios.map((premio) => premio.montoGuaranies), ["", "", ""])
  assert.equal(resumenPremiosRanking(premios), "1° Moto · 2° Casco · 3° Campera")
})

test("conserva los montos en guaraníes y rechaza valores inválidos", () => {
  const premios = [1, 2, 3].map((puesto) => ({ puesto, titulo: "Premio", descripcion: "", imagenUrl: "", montoGuaranies: "1500000" }))
  assert.deepEqual(validarPremiosRanking(premios).map((premio) => premio.montoGuaranies), ["1500000", "1500000", "1500000"])
  for (const montoGuaranies of ["0", "-1", "1.5", "1e3", "abc", 1000]) {
    assert.throws(() => validarPremiosRanking(premios.map((premio) => ({ ...premio, montoGuaranies }))))
  }
})

test("rechaza imágenes inseguras y premios incompletos", () => {
  assert.throws(() => validarPremiosRanking([{ puesto: 1, titulo: "Moto", descripcion: "", imagenUrl: "javascript:alert(1)" }]))
  assert.throws(() => validarPremiosRanking([1, 2, 3].map((puesto) => ({ puesto, titulo: "Premio", descripcion: "", imagenUrl: "http://inseguro.test" }))))
})

test("resultado público no expone identidad ni contacto", () => {
  const publico = publicarResultadoRanking([{ puesto: 1, titulo: "Moto", descripcion: "", imagenUrl: "", montoGuaranies: "1500000", personaKey: "email:privado@test.com", nombre: "Nombre Apellido", nombrePublico: "Nombre A.", email: "privado@test.com", telefono: "3794123456", chances: 25 }])
  assert.deepEqual(publico, [{ puesto: 1, nombre: "Nombre A.", chances: 25 }])
})
