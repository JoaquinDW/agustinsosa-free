/**
 * Script para corregir números duplicados en el sorteo
 *
 * Este script:
 * 1. Identifica todos los compradores con números duplicados
 * 2. Mantiene los números de los compradores más antiguos (first-come, first-served)
 * 3. Reasigna números disponibles a los compradores más recientes
 * 4. Genera un reporte detallado de cambios
 *
 * USO:
 *   npx tsx scripts/fix-duplicates.ts <sorteo_id>
 *
 * IMPORTANTE: Hacer backup de la base de datos antes de ejecutar
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Variables de entorno no configuradas")
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗")
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗")
  console.error("\n💡 Asegúrate de que .env.local contenga:")
  console.error("   NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui")
  console.error("   SUPABASE_SERVICE_ROLE_KEY=tu_service_key_aqui")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CompradorConDuplicados {
  comprador_id: string
  comprador_nombre: string
  numeros_duplicados: number[]
  numeros_unicos: number[]
  fecha_compra: string
  debe_mantener: boolean
}

interface CambioRealizado {
  comprador_id: string
  nombre: string
  numeros_removidos: number[]
  numeros_nuevos: number[]
  numeros_finales: number[]
}

async function diagnosticar(sorteoId: string) {
  console.log("\n📊 DIAGNÓSTICO DE DUPLICADOS")
  console.log("═".repeat(60))

  const { data, error } = await supabase.rpc("diagnosticar_duplicados", {
    p_sorteo_id: sorteoId,
  })

  if (error) {
    console.error("❌ Error en diagnóstico:", error)
    return null
  }

  if (!data || data.length === 0) {
    console.log("✅ No se encontraron duplicados")
    return null
  }

  const stats = data[0]
  console.log(`Total números asignados: ${stats.total_numeros_asignados}`)
  console.log(`Números únicos: ${stats.numeros_unicos}`)
  console.log(`Números duplicados: ${stats.numeros_duplicados}`)
  console.log(`Compradores afectados: ${stats.compradores_afectados}`)

  if (stats.numeros_duplicados === 0) {
    console.log("\n✅ No hay duplicados que corregir")
    return null
  }

  return stats
}

async function obtenerCompradoresAfectados(
  sorteoId: string
): Promise<CompradorConDuplicados[]> {
  const { data, error } = await supabase.rpc(
    "obtener_compradores_con_duplicados",
    {
      p_sorteo_id: sorteoId,
    }
  )

  if (error) {
    console.error("❌ Error obteniendo compradores:", error)
    throw error
  }

  return data || []
}

async function obtenerNumerosDisponibles(sorteoId: string): Promise<number[]> {
  const { data, error } = await supabase.rpc(
    "obtener_numeros_disponibles_para_reasignacion",
    {
      p_sorteo_id: sorteoId,
    }
  )

  if (error) {
    console.error("❌ Error obteniendo números disponibles:", error)
    throw error
  }

  return (data || []).map((item: any) => item.numero)
}

async function obtenerCompradorCompleto(compradorId: string) {
  const { data, error } = await supabase
    .from("compradores")
    .select("*")
    .eq("id", compradorId)
    .single()

  if (error) {
    throw error
  }

  return data
}

async function actualizarNumerosComprador(
  compradorId: string,
  nuevosNumeros: number[]
) {
  const { error } = await supabase
    .from("compradores")
    .update({
      numeros_asignados: nuevosNumeros,
      updated_at: new Date().toISOString(),
    })
    .eq("id", compradorId)

  if (error) {
    throw error
  }
}

function generarReporte(
  sorteoId: string,
  cambios: CambioRealizado[],
  dryRun: boolean
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `fix-duplicates-report-${timestamp}.txt`
  const filepath = path.join(process.cwd(), "scripts", filename)

  let reporte = ""
  reporte += "═".repeat(80) + "\n"
  reporte += "REPORTE DE CORRECCIÓN DE NÚMEROS DUPLICADOS\n"
  reporte += "═".repeat(80) + "\n\n"
  reporte += `Fecha: ${new Date().toLocaleString()}\n`
  reporte += `Sorteo ID: ${sorteoId}\n`
  reporte += `Modo: ${dryRun ? "DRY RUN (simulación)" : "EJECUCIÓN REAL"}\n`
  reporte += `Total compradores modificados: ${cambios.length}\n\n`

  reporte += "─".repeat(80) + "\n"
  reporte += "CAMBIOS REALIZADOS\n"
  reporte += "─".repeat(80) + "\n\n"

  cambios.forEach((cambio, index) => {
    reporte += `${index + 1}. ${cambio.nombre} (${cambio.comprador_id})\n`
    reporte += `   Números removidos (duplicados): ${cambio.numeros_removidos.join(", ")}\n`
    reporte += `   Números nuevos asignados:       ${cambio.numeros_nuevos.join(", ")}\n`
    reporte += `   Números finales:                ${cambio.numeros_finales.join(", ")}\n`
    reporte += "\n"
  })

  reporte += "═".repeat(80) + "\n"
  reporte += "FIN DEL REPORTE\n"
  reporte += "═".repeat(80) + "\n"

  fs.writeFileSync(filepath, reporte, "utf-8")
  console.log(`\n📄 Reporte guardado en: ${filename}`)

  return filepath
}

async function corregirDuplicados(sorteoId: string, dryRun = true) {
  console.log("\n🔧 CORRECCIÓN DE DUPLICADOS")
  console.log("═".repeat(60))

  if (dryRun) {
    console.log("⚠️  MODO DRY RUN - No se harán cambios reales")
  } else {
    console.log("⚠️  MODO EJECUCIÓN REAL - Se modificará la base de datos")
  }

  // 1. Obtener compradores afectados
  console.log("\n1️⃣ Obteniendo compradores afectados...")
  const compradores = await obtenerCompradoresAfectados(sorteoId)

  const compradoresParaModificar = compradores.filter((c) => !c.debe_mantener)
  const compradoresQueMantienen = compradores.filter((c) => c.debe_mantener)

  console.log(
    `   ✓ ${compradoresQueMantienen.length} compradores mantienen sus números (más antiguos)`
  )
  console.log(
    `   ✓ ${compradoresParaModificar.length} compradores necesitan reasignación`
  )

  if (compradoresParaModificar.length === 0) {
    console.log("\n✅ No hay compradores que necesiten modificación")
    return
  }

  // 2. Obtener números disponibles
  console.log("\n2️⃣ Obteniendo números disponibles...")
  const numerosDisponibles = await obtenerNumerosDisponibles(sorteoId)
  console.log(`   ✓ ${numerosDisponibles.length} números disponibles`)

  // 3. Calcular cuántos números necesitamos
  const numerosNecesarios = compradoresParaModificar.reduce(
    (total, c) => total + (c.numeros_duplicados?.length || 0),
    0
  )
  console.log(`   ✓ ${numerosNecesarios} números necesarios para reasignación`)

  if (numerosDisponibles.length < numerosNecesarios) {
    console.error(
      "\n❌ ERROR: No hay suficientes números disponibles para reasignar"
    )
    console.error(
      `   Necesarios: ${numerosNecesarios}, Disponibles: ${numerosDisponibles.length}`
    )
    process.exit(1)
  }

  // 4. Realizar reasignaciones
  console.log("\n3️⃣ Reasignando números...")
  const cambios: CambioRealizado[] = []
  let poolDisponibles = [...numerosDisponibles]

  for (const comprador of compradoresParaModificar) {
    console.log(`\n   📝 Procesando: ${comprador.comprador_nombre}`)

    // Obtener datos completos del comprador
    const compradorCompleto = await obtenerCompradorCompleto(
      comprador.comprador_id
    )

    // Números que debe conservar (los que no son duplicados)
    const numerosAConservar =
      compradorCompleto.numeros_asignados.filter(
        (n: number) => !comprador.numeros_duplicados.includes(n)
      ) || []

    // Números duplicados que debe reemplazar
    const numerosARemover = comprador.numeros_duplicados || []

    // Tomar nuevos números del pool
    const numerosNuevos = poolDisponibles.splice(0, numerosARemover.length)

    // Calcular números finales
    const numerosFinales = [...numerosAConservar, ...numerosNuevos].sort(
      (a, b) => a - b
    )

    console.log(`      Conserva: ${numerosAConservar.join(", ")}`)
    console.log(`      Remueve:  ${numerosARemover.join(", ")}`)
    console.log(`      Nuevos:   ${numerosNuevos.join(", ")}`)
    console.log(`      Finales:  ${numerosFinales.join(", ")}`)

    // Guardar cambio en el reporte
    cambios.push({
      comprador_id: comprador.comprador_id,
      nombre: comprador.comprador_nombre,
      numeros_removidos: numerosARemover,
      numeros_nuevos: numerosNuevos,
      numeros_finales: numerosFinales,
    })

    // Actualizar en la base de datos (solo si no es dry run)
    if (!dryRun) {
      await actualizarNumerosComprador(comprador.comprador_id, numerosFinales)
      console.log(`      ✅ Actualizado en base de datos`)
    }
  }

  // 5. Generar reporte
  console.log("\n4️⃣ Generando reporte...")
  generarReporte(sorteoId, cambios, dryRun)

  // 6. Verificar resultado
  if (!dryRun) {
    console.log("\n5️⃣ Verificando corrección...")
    const statsFinales = await diagnosticar(sorteoId)
    if (statsFinales && statsFinales.numeros_duplicados === 0) {
      console.log("\n✅ ¡ÉXITO! Todos los duplicados han sido corregidos")
    } else {
      console.log(
        "\n⚠️  ADVERTENCIA: Aún quedan duplicados. Ejecutar nuevamente."
      )
    }
  }

  console.log("\n" + "═".repeat(60))
  console.log(
    dryRun
      ? "✅ Simulación completada. Revisar el reporte."
      : "✅ Corrección completada. Revisar el reporte."
  )
}

// Main
async function main() {
  console.log("\n╔═══════════════════════════════════════════════════════════╗")
  console.log("║   SCRIPT DE CORRECCIÓN DE NÚMEROS DUPLICADOS            ║")
  console.log("╚═══════════════════════════════════════════════════════════╝")

  const args = process.argv.slice(2)
  const sorteoId = args[0]
  const modo = args[1] || "dry-run"

  if (!sorteoId) {
    console.error("\n❌ Error: Debe proporcionar un sorteo_id")
    console.error("\nUso:")
    console.error("  npx tsx scripts/fix-duplicates.ts <sorteo_id> [dry-run|execute]")
    console.error("\nEjemplo:")
    console.error('  npx tsx scripts/fix-duplicates.ts "abc-123-def" dry-run')
    process.exit(1)
  }

  const dryRun = modo !== "execute"

  try {
    // 1. Diagnóstico inicial
    const stats = await diagnosticar(sorteoId)
    if (!stats) {
      return
    }

    // 2. Confirmar antes de ejecutar (si no es dry-run)
    if (!dryRun) {
      console.log("\n⚠️  ADVERTENCIA: Está a punto de modificar la base de datos")
      console.log(
        "   Esto cambiará los números asignados de varios compradores"
      )
      console.log(
        "   Asegúrese de haber hecho un backup de la base de datos\n"
      )
      console.log('   Para continuar, ejecute con el parámetro "execute"')
      console.log('   Para simular, use "dry-run" (por defecto)')
      return
    }

    // 3. Corregir duplicados
    await corregirDuplicados(sorteoId, dryRun)
  } catch (error) {
    console.error("\n❌ ERROR FATAL:", error)
    process.exit(1)
  }
}

main()
