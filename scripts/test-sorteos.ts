#!/usr/bin/env tsx

/**
 * Script para testear el flujo completo de sorteos desde línea de comandos
 */

import { supabase } from "../lib/supabase"

async function testFlujoCompleto() {
  const args = process.argv.slice(2)
  const accion = args[0]
  const sorteoId = args[1]

  if (!accion) {
    console.log(`
🧪 TESTING DE SORTEOS

Uso: pnpm run test-sorteos <accion> [sorteoId]

Acciones disponibles:
  listar                    - Ver sorteos disponibles
  completar <sorteoId>      - Marcar sorteo como completo
  simular <sorteoId> [días] - Simular que pasaron N días (default: 1)
  verificar                 - Ejecutar verificación de sorteos
  resetear <sorteoId>       - Resetear sorteo a activo
  scrapper                  - Probar solo el scrapper
  flujo <sorteoId>          - Ejecutar flujo completo automático

Ejemplos:
  pnpm run test-sorteos listar
  pnpm run test-sorteos completar abc123
  pnpm run test-sorteos simular abc123 2
  pnpm run test-sorteos flujo abc123
`)
    return
  }

  try {
    switch (accion) {
      case "listar":
        await listarSorteos()
        break
      case "completar":
        if (!sorteoId) throw new Error("Falta sorteoId")
        await completarSorteo(sorteoId)
        break
      case "simular":
        if (!sorteoId) throw new Error("Falta sorteoId")
        const dias = parseInt(args[2]) || 1
        await simularDias(sorteoId, dias)
        break
      case "verificar":
        await verificarSorteos()
        break
      case "resetear":
        if (!sorteoId) throw new Error("Falta sorteoId")
        await resetearSorteo(sorteoId)
        break
      case "scrapper":
        await probarScrapper()
        break
      case "flujo":
        if (!sorteoId) throw new Error("Falta sorteoId")
        await flujoCompleto(sorteoId)
        break
      default:
        console.error(`❌ Acción desconocida: ${accion}`)
        process.exit(1)
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

async function listarSorteos() {
  console.log("📋 Sorteos disponibles:")

  const { data: sorteos, error } = await supabase
    .from("sorteos")
    .select("id, nombre, estado, created_at")
    .order("created_at", { ascending: false })

  if (error || !sorteos?.length) {
    console.log("No hay sorteos disponibles")
    return
  }

  sorteos.forEach((sorteo, index) => {
    console.log(`${index + 1}. ${sorteo.nombre}`)
    console.log(`   ID: ${sorteo.id}`)
    console.log(`   Estado: ${sorteo.estado}`)
    console.log(`   Fecha: ${new Date(sorteo.created_at).toLocaleDateString()}`)
    console.log("")
  })
}

async function completarSorteo(sorteoId: string) {
  console.log(`🎯 Marcando sorteo ${sorteoId} como completo...`)

  const { error } = await supabase
    .from("sorteos")
    .update({
      estado: "completo",
      fecha_sorteo_realizado: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sorteoId)

  if (error) {
    throw new Error(`Error actualizando sorteo: ${error.message}`)
  }

  console.log("✅ Sorteo marcado como completo")
}

async function simularDias(sorteoId: string, dias: number) {
  console.log(`⏰ Simulando que pasaron ${dias} día(s)...`)

  const fechaSimulada = new Date()
  fechaSimulada.setDate(fechaSimulada.getDate() - dias)

  const { error } = await supabase
    .from("sorteos")
    .update({
      fecha_sorteo_realizado: fechaSimulada.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sorteoId)

  if (error) {
    throw new Error(`Error simulando fecha: ${error.message}`)
  }

  console.log(`✅ Simulado: ${dias} día(s) han pasado`)
  console.log(`   Fecha simulada: ${fechaSimulada.toLocaleString()}`)
}

async function verificarSorteos() {
  console.log("🔍 Ejecutando verificación de sorteos...")

  const { verificarYEjecutarSorteos } = await import("../lib/sorteoScrapper")
  await verificarYEjecutarSorteos()

  console.log("✅ Verificación completada")
}

async function resetearSorteo(sorteoId: string) {
  console.log(`🔄 Reseteando sorteo ${sorteoId}...`)

  // Resetear sorteo
  const { error: errorSorteo } = await supabase
    .from("sorteos")
    .update({
      estado: "activo",
      fecha_sorteo_realizado: null,
      numero_ganador: null,
      ganador_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sorteoId)

  if (errorSorteo) {
    throw new Error(`Error reseteando sorteo: ${errorSorteo.message}`)
  }

  // Resetear ganadores
  await supabase
    .from("compradores")
    .update({ es_ganador: false })
    .eq("sorteo_id", sorteoId)

  console.log("✅ Sorteo reseteado a estado activo")
}

async function probarScrapper() {
  console.log("🎲 Probando scrapper de lotería...")

  const { obtenerPrimerNumero } = await import("../lib/sorteoScrapper")
  const numero = await obtenerPrimerNumero()

  if (numero) {
    console.log(`🏆 Número obtenido: ${numero}`)
  } else {
    console.log("❌ No se pudo obtener el número")
  }
}

async function flujoCompleto(sorteoId: string) {
  console.log(`🚀 Ejecutando flujo completo para sorteo ${sorteoId}...`)

  try {
    // Paso 1: Completar sorteo
    console.log("\n📍 Paso 1: Completando sorteo...")
    await completarSorteo(sorteoId)

    // Paso 2: Simular día siguiente
    console.log("\n📍 Paso 2: Simulando día siguiente...")
    await simularDias(sorteoId, 1)

    // Paso 3: Verificar sorteos
    console.log("\n📍 Paso 3: Verificando sorteos...")
    await verificarSorteos()

    // Paso 4: Verificar resultado
    console.log("\n📍 Paso 4: Verificando resultado...")
    const { data: sorteo, error } = await supabase
      .from("sorteos")
      .select(
        `
        *,
        compradores!compradores_sorteo_id_fkey(*)
      `
      )
      .eq("id", sorteoId)
      .single()

    if (error) {
      throw new Error(`Error obteniendo resultado: ${error.message}`)
    }

    console.log(`\n🎉 RESULTADO FINAL:`)
    console.log(`   Estado: ${sorteo.estado}`)
    console.log(`   Número ganador: ${sorteo.numero_ganador || "N/A"}`)

    if (sorteo.compradores) {
      const ganador = sorteo.compradores.find((c: any) => c.es_ganador)
      if (ganador) {
        console.log(`   👑 Ganador: ${ganador.nombre}`)
        console.log(`   📧 Email: ${ganador.email}`)
      } else {
        console.log(`   ⚠️  Número determinado pero sin comprador asignado`)
      }
    }

    console.log("\n✅ Flujo completo ejecutado exitosamente")
  } catch (error) {
    console.error(
      `❌ Error en flujo completo: ${
        error instanceof Error ? error.message : error
      }`
    )
    throw error
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  testFlujoCompleto()
}
