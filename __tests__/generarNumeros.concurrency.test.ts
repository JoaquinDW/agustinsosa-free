/**
 * Tests de Concurrencia para Generación de Números
 *
 * Verifica que el sistema NO genere números duplicados
 * cuando múltiples requests ocurren simultáneamente
 */

import { generarNumerosUnicos } from "../lib/database"
import { verificarNumerosUnicos } from "../lib/verificarNumerosUnicos"

// Mock de Supabase si es necesario
// jest.mock("../lib/supabase")

describe("Generación de Números - Tests de Concurrencia", () => {
  // ID de sorteo de prueba
  const SORTEO_TEST_ID = "test-sorteo-concurrency"

  beforeAll(async () => {
    // Setup: Crear sorteo de prueba si es necesario
    console.log("🧪 Iniciando tests de concurrencia...")
  })

  afterAll(async () => {
    // Cleanup: Limpiar datos de prueba
    console.log("🧹 Limpiando datos de prueba...")
  })

  test("Previene duplicados en 10 requests simultáneos", async () => {
    const CANTIDAD_REQUESTS = 10
    const NUMEROS_POR_REQUEST = 6

    console.log(
      `\n🧪 TEST: ${CANTIDAD_REQUESTS} requests simultáneos, ${NUMEROS_POR_REQUEST} números c/u`
    )

    // Ejecutar generación de números en paralelo
    const promises = Array(CANTIDAD_REQUESTS)
      .fill(null)
      .map(() => generarNumerosUnicos(SORTEO_TEST_ID, NUMEROS_POR_REQUEST))

    const resultados = await Promise.allSettled(promises)

    // Extraer números generados exitosamente
    const numerosGenerados: number[] = []
    let exitos = 0
    let fallos = 0

    for (const resultado of resultados) {
      if (resultado.status === "fulfilled") {
        numerosGenerados.push(...resultado.value)
        exitos++
      } else {
        fallos++
        console.log(`   ⚠️  Request falló: ${resultado.reason}`)
      }
    }

    console.log(`   ✓ Requests exitosos: ${exitos}`)
    console.log(`   ✗ Requests fallidos: ${fallos}`)
    console.log(`   📊 Total números generados: ${numerosGenerados.length}`)

    // Verificar que NO haya duplicados
    const numerosUnicos = new Set(numerosGenerados)
    const duplicados = numerosGenerados.length - numerosUnicos.size

    console.log(`   📊 Números únicos: ${numerosUnicos.size}`)
    console.log(`   📊 Duplicados: ${duplicados}`)

    // ASSERTION CRÍTICA: NO debe haber duplicados
    expect(duplicados).toBe(0)
    expect(numerosGenerados.length).toBe(numerosUnicos.size)
  }, 30000) // Timeout de 30 segundos

  test("Previene duplicados en 50 requests simultáneos (stress test)", async () => {
    const CANTIDAD_REQUESTS = 50
    const NUMEROS_POR_REQUEST = 4

    console.log(
      `\n🧪 STRESS TEST: ${CANTIDAD_REQUESTS} requests simultáneos, ${NUMEROS_POR_REQUEST} números c/u`
    )

    const promises = Array(CANTIDAD_REQUESTS)
      .fill(null)
      .map(() => generarNumerosUnicos(SORTEO_TEST_ID, NUMEROS_POR_REQUEST))

    const resultados = await Promise.allSettled(promises)

    const numerosGenerados: number[] = []
    let exitos = 0

    for (const resultado of resultados) {
      if (resultado.status === "fulfilled") {
        numerosGenerados.push(...resultado.value)
        exitos++
      }
    }

    console.log(`   ✓ Requests exitosos: ${exitos}/${CANTIDAD_REQUESTS}`)
    console.log(`   📊 Total números generados: ${numerosGenerados.length}`)

    const numerosUnicos = new Set(numerosGenerados)
    const duplicados = numerosGenerados.length - numerosUnicos.size

    console.log(`   📊 Números únicos: ${numerosUnicos.size}`)
    console.log(`   📊 Duplicados: ${duplicados}`)

    expect(duplicados).toBe(0)
  }, 60000) // Timeout de 60 segundos

  test("Verificación post-generación detecta duplicados", async () => {
    console.log("\n🧪 TEST: Verificación post-generación")

    // Generar números
    const numeros = await generarNumerosUnicos(SORTEO_TEST_ID, 6)

    // Verificar
    const verificacion = await verificarNumerosUnicos(SORTEO_TEST_ID, numeros)

    console.log(`   📊 Resultado: ${verificacion.mensaje}`)
    console.log(`   ✓ Duplicados: ${verificacion.duplicados}`)

    // NO debe haber duplicados en números recién generados
    expect(verificacion.duplicados).toBe(false)
    expect(verificacion.numerosConflicto).toHaveLength(0)
  })

  test("Detecta duplicados internos en array", async () => {
    console.log("\n🧪 TEST: Detección de duplicados internos")

    // Array con duplicado interno
    const numerosConDuplicado = [100, 200, 300, 200, 400]

    const verificacion = await verificarNumerosUnicos(
      SORTEO_TEST_ID,
      numerosConDuplicado
    )

    console.log(`   📊 Resultado: ${verificacion.mensaje}`)
    console.log(`   ✓ Duplicados detectados: ${verificacion.duplicados}`)
    console.log(
      `   ✓ Números en conflicto: ${verificacion.numerosConflicto.join(", ")}`
    )

    // DEBE detectar el duplicado
    expect(verificacion.duplicados).toBe(true)
    expect(verificacion.numerosConflicto).toContain(200)
  })

  test("Requests secuenciales no generan duplicados", async () => {
    console.log("\n🧪 TEST: Requests secuenciales")

    const CANTIDAD_REQUESTS = 10
    const todosLosNumeros: number[] = []

    // Ejecutar UNO POR UNO (no en paralelo)
    for (let i = 0; i < CANTIDAD_REQUESTS; i++) {
      const numeros = await generarNumerosUnicos(SORTEO_TEST_ID, 6)
      todosLosNumeros.push(...numeros)
      console.log(`   ✓ Request ${i + 1}: generados ${numeros.length} números`)
    }

    const numerosUnicos = new Set(todosLosNumeros)
    const duplicados = todosLosNumeros.length - numerosUnicos.size

    console.log(`   📊 Total números: ${todosLosNumeros.length}`)
    console.log(`   📊 Números únicos: ${numerosUnicos.size}`)
    console.log(`   📊 Duplicados: ${duplicados}`)

    expect(duplicados).toBe(0)
  }, 60000)
})

describe("Funciones SQL - Verificación", () => {
  test("Función generar_numeros_unicos_atomico está disponible", async () => {
    console.log("\n🧪 TEST: Verificar función SQL existe")

    const { verificarFuncionesSQL } = await import("../lib/verificarFuncionesSQL")
    const health = await verificarFuncionesSQL()

    console.log(`   📊 Funciones disponibles: ${health.funcionesDisponibles.join(", ")}`)
    console.log(`   📊 Funciones faltantes: ${health.funcionesFaltantes.join(", ")}`)

    // Función crítica debe estar disponible
    expect(health.funcionesDisponibles).toContain("generar_numeros_unicos_atomico")
    expect(health.ok).toBe(true)
  })
})
