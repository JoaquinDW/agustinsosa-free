/**
 * Script simplificado para corregir duplicados
 * Versión optimizada que procesa en batches
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables de entorno no configuradas")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosticoRapido(sorteoId: string) {
  console.log("\n📊 DIAGNÓSTICO RÁPIDO")
  console.log("═".repeat(60))

  const { data, error } = await supabase.rpc("diagnosticar_duplicados_rapido", {
    p_sorteo_id: sorteoId,
  })

  if (error) {
    console.error("❌ Error:", error.message)
    return null
  }

  const stats = data[0]
  console.log(`Total números asignados: ${stats.total_numeros_asignados}`)
  console.log(`Números únicos: ${stats.numeros_unicos}`)
  console.log(`Números duplicados: ${stats.numeros_duplicados}`)

  return stats
}

async function obtenerCompradoresConDuplicados(sorteoId: string) {
  console.log("\n🔍 Obteniendo compradores con duplicados...")

  // Obtener TODOS los compradores usando paginación
  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("compradores")
      .select(
        "id, nombre, email, instagram_username, created_at, numeros_asignados, cantidad_chances, sorteo_id"
      )
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("❌ Error:", error)
      throw error
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data]
      from += pageSize

      if (data.length < pageSize) {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  const compradores = allData

  console.log(`   Total compradores: ${compradores.length}`)

  // Detectar dos tipos de problemas:
  // 1. Compradores con duplicados INTERNOS en su propio array
  // 2. Números que aparecen en múltiples compradores diferentes

  const compradoresConDuplicadosInternos = []
  const numeroMap = new Map<
    number,
    Array<{
      id: string
      nombre: string
      email: string
      instagram_username: string
      created_at: string
    }>
  >()

  for (const comprador of compradores) {
    // Verificar duplicados internos
    const numerosUnicos = new Set(comprador.numeros_asignados)
    const tieneDuplicadosInternos =
      numerosUnicos.size !== comprador.numeros_asignados.length

    if (tieneDuplicadosInternos) {
      console.log(
        `   ⚠️  ${comprador.nombre}: tiene duplicados INTERNOS (${comprador.numeros_asignados.length} números, ${numerosUnicos.size} únicos)`
      )
      compradoresConDuplicadosInternos.push({
        id: comprador.id,
        nombre: comprador.nombre,
        email: comprador.email,
        instagram_username: comprador.instagram_username,
        created_at: comprador.created_at,
        numeros_asignados: comprador.numeros_asignados,
        numeros_unicos: Array.from(numerosUnicos),
        cantidad_esperada: comprador.cantidad_chances,
      })
    }

    // Mapear números a compradores
    for (const numero of comprador.numeros_asignados) {
      if (!numeroMap.has(numero)) {
        numeroMap.set(numero, [])
      }
      numeroMap.get(numero)!.push({
        id: comprador.id,
        nombre: comprador.nombre,
        email: comprador.email,
        instagram_username: comprador.instagram_username,
        created_at: comprador.created_at,
      })
    }
  }

  console.log(
    `   ✓ ${compradoresConDuplicadosInternos.length} compradores con duplicados INTERNOS`
  )

  // Encontrar números que aparecen en múltiples compradores
  const numerosDuplicadosEntrCompradores = new Set<number>()
  for (const [numero, owners] of numeroMap) {
    if (owners.length > 1) {
      numerosDuplicadosEntrCompradores.add(numero)
      console.log(
        `   ⚠️  Número ${numero} aparece en ${
          owners.length
        } compradores: ${owners.map((o) => o.nombre).join(", ")}`
      )
    }
  }

  console.log(
    `   ✓ ${numerosDuplicadosEntrCompradores.size} números duplicados ENTRE compradores`
  )

  // Preparar lista de compradores afectados
  const compradoresAfectados = []

  // Tipo 1: Compradores con duplicados internos
  for (const comprador of compradoresConDuplicadosInternos) {
    const numerosUnicos = comprador.numeros_unicos
    const numerosFaltantes = comprador.cantidad_esperada - numerosUnicos.length

    compradoresAfectados.push({
      id: comprador.id,
      nombre: comprador.nombre,
      email: comprador.email,
      instagram_username: comprador.instagram_username,
      created_at: comprador.created_at,
      numeros_asignados: comprador.numeros_asignados,
      numeros_a_remover: [], // Vamos a reemplazar todo el array
      numeros_a_mantener: numerosUnicos,
      necesita_nuevos: numerosFaltantes,
      tipo: "duplicados_internos",
    })
  }

  // Tipo 2: Números duplicados entre compradores
  const numerosQueMantienePorComprador = new Map<string, Set<number>>()

  for (const numero of numerosDuplicadosEntrCompradores) {
    const owners = numeroMap.get(numero)!
    // El primer comprador (más antiguo) mantiene el número
    const primerComprador = owners[0]

    if (!numerosQueMantienePorComprador.has(primerComprador.id)) {
      numerosQueMantienePorComprador.set(primerComprador.id, new Set())
    }
    numerosQueMantienePorComprador.get(primerComprador.id)!.add(numero)
  }

  for (const comprador of compradores) {
    // Skip si ya está en la lista por duplicados internos
    if (compradoresAfectados.some((c) => c.id === comprador.id)) {
      continue
    }

    const numerosQueMantieneEsteComprador =
      numerosQueMantienePorComprador.get(comprador.id) || new Set()

    const numerosARemover: number[] = []
    const numerosAMantener: number[] = []

    for (const numero of comprador.numeros_asignados) {
      if (
        numerosDuplicadosEntrCompradores.has(numero) &&
        !numerosQueMantieneEsteComprador.has(numero)
      ) {
        numerosARemover.push(numero)
      } else {
        numerosAMantener.push(numero)
      }
    }

    if (numerosARemover.length > 0) {
      compradoresAfectados.push({
        id: comprador.id,
        nombre: comprador.nombre,
        email: comprador.email,
        instagram_username: comprador.instagram_username,
        created_at: comprador.created_at,
        numeros_asignados: comprador.numeros_asignados,
        numeros_a_remover: numerosARemover,
        numeros_a_mantener: numerosAMantener,
        necesita_nuevos: numerosARemover.length,
        tipo: "duplicados_entre_compradores",
      })
    }
  }

  console.log(
    `\n   ✅ TOTAL: ${compradoresAfectados.length} compradores necesitan corrección`
  )

  if (compradoresAfectados.length > 0) {
    console.log("\n   Ejemplos de compradores afectados:")
    for (let i = 0; i < Math.min(5, compradoresAfectados.length); i++) {
      const c = compradoresAfectados[i]
      console.log(
        `     ${i + 1}. ${c.nombre} (${c.tipo}): necesita ${
          c.necesita_nuevos
        } números nuevos`
      )
    }
  }

  return {
    compradoresAfectados,
    numerosDuplicados: numerosDuplicadosEntrCompradores,
    numeroMap,
  }
}

async function obtenerNumerosDisponibles(
  sorteoId: string,
  compradoresAfectados: any[]
) {
  // Obtener total_chances del sorteo
  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("total_chances")
    .eq("id", sorteoId)
    .single()

  const totalChances = sorteo?.total_chances || 9999

  // Obtener TODOS los compradores usando paginación
  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("compradores")
      .select("id, numeros_asignados")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("❌ Error obteniendo compradores:", error)
      break
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data]
      from += pageSize

      if (data.length < pageSize) {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  // Crear un set con todos los números que se van a MANTENER
  // Para cada comprador, usar sus números finales después de la corrección
  const numerosQueSeVanAMantener = new Set<number>()

  for (const comprador of allData) {
    // Buscar si este comprador está en la lista de afectados
    const afectado = compradoresAfectados.find((c) => c.id === comprador.id)

    if (afectado) {
      // Este comprador va a tener nuevos números, usar solo los que mantiene
      for (const num of afectado.numeros_a_mantener) {
        numerosQueSeVanAMantener.add(num)
      }
    } else {
      // Este comprador NO está afectado, mantiene todos sus números
      for (const num of comprador.numeros_asignados) {
        numerosQueSeVanAMantener.add(num)
      }
    }
  }

  // Generar lista de disponibles (números que NO se van a mantener)
  const disponibles: number[] = []
  for (let i = 0; i <= totalChances; i++) {
    if (!numerosQueSeVanAMantener.has(i)) {
      disponibles.push(i)
    }
  }

  // Mezclar para asignación aleatoria
  for (let i = disponibles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]]
  }

  return disponibles
}

async function corregirDuplicados(sorteoId: string, dryRun = true) {
  console.log("\n🔧 CORRECCIÓN DE DUPLICADOS")
  console.log("═".repeat(60))
  console.log(
    dryRun ? "⚠️  MODO: DRY RUN (simulación)" : "⚠️  MODO: EJECUCIÓN REAL"
  )

  // 1. Obtener compradores afectados
  const { compradoresAfectados, numerosDuplicados, numeroMap } =
    await obtenerCompradoresConDuplicados(sorteoId)

  if (compradoresAfectados.length === 0) {
    console.log("\n✅ No hay compradores que necesiten corrección")
    return
  }

  // 2. Obtener números disponibles
  console.log("\n📋 Obteniendo números disponibles...")
  const numerosDisponibles = await obtenerNumerosDisponibles(
    sorteoId,
    compradoresAfectados
  )
  console.log(`   ✓ ${numerosDisponibles.length} números disponibles`)

  // 3. Calcular cuántos necesitamos
  const totalNecesarios = compradoresAfectados.reduce(
    (sum, c) => sum + c.necesita_nuevos,
    0
  )
  console.log(`   ✓ ${totalNecesarios} números necesarios`)

  if (numerosDisponibles.length < totalNecesarios) {
    console.error(
      `\n❌ ERROR: No hay suficientes números disponibles (necesarios: ${totalNecesarios}, disponibles: ${numerosDisponibles.length})`
    )
    process.exit(1)
  }

  // 4. Reasignar y preparar reporte
  console.log("\n📝 Procesando reasignaciones...")
  let poolIndex = 0
  const cambios: any[] = []

  for (const comprador of compradoresAfectados) {
    console.log(`\n   ${comprador.nombre} (${comprador.tipo}):`)
    console.log(`      Email: ${comprador.email || "N/A"}`)
    console.log(`      Instagram: ${comprador.instagram_username || "N/A"}`)
    console.log(`      Mantiene: ${comprador.numeros_a_mantener.join(", ")}`)
    if (comprador.numeros_a_remover.length > 0) {
      console.log(`      Remueve:  ${comprador.numeros_a_remover.join(", ")}`)
    }

    // Tomar nuevos números del pool
    const numerosNuevos = numerosDisponibles.slice(
      poolIndex,
      poolIndex + comprador.necesita_nuevos
    )
    poolIndex += comprador.necesita_nuevos

    console.log(`      Nuevos:   ${numerosNuevos.join(", ")}`)

    // Calcular números finales
    const numerosFinales = [
      ...comprador.numeros_a_mantener,
      ...numerosNuevos,
    ].sort((a, b) => a - b)
    console.log(`      Finales:  ${numerosFinales.join(", ")}`)

    // Guardar cambio para el reporte
    cambios.push({
      nombre: comprador.nombre,
      email: comprador.email || "N/A",
      instagram: comprador.instagram_username || "N/A",
      tipo: comprador.tipo,
      numeros_removidos: comprador.numeros_a_remover.join(", "),
      numeros_nuevos: numerosNuevos.join(", "),
      numeros_finales: numerosFinales.join(", "),
    })

    // Actualizar en BD (solo si no es dry run)
    if (!dryRun) {
      const { error } = await supabase
        .from("compradores")
        .update({
          numeros_asignados: numerosFinales,
          updated_at: new Date().toISOString(),
        })
        .eq("id", comprador.id)

      if (error) {
        console.error(`      ❌ Error actualizando:`, error.message)
      } else {
        console.log(`      ✅ Actualizado`)
      }
    }
  }

  // 5. Generar reporte CSV
  generarReporteCSV(cambios, sorteoId, dryRun)

  console.log("\n" + "═".repeat(60))
  console.log(
    dryRun
      ? "✅ Simulación completada. Revisar cambios arriba."
      : "✅ Corrección completada."
  )
}

function generarReporteCSV(cambios: any[], sorteoId: string, dryRun: boolean) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0]
  const filename = `reporte-cambios-duplicados-${timestamp}.csv`
  const filepath = path.join(process.cwd(), "scripts", filename)

  let csv =
    "Nombre,Email,Instagram,Tipo,Números Removidos,Números Nuevos,Sorteo ID,Números Finales\n"

  for (const cambio of cambios) {
    csv += `"${cambio.nombre}","${cambio.email}","${cambio.instagram}","${cambio.tipo}","${cambio.numeros_removidos}","${cambio.numeros_nuevos}","${sorteoId}","${cambio.numeros_finales}"\n`
  }

  fs.writeFileSync(filepath, csv, "utf-8")

  console.log(`\n📄 Reporte CSV generado: ${filename}`)
  console.log(`   Ubicación: ${filepath}`)
  console.log(`   Total de compradores en el reporte: ${cambios.length}`)
}

async function main() {
  console.log("\n╔═══════════════════════════════════════════════════════════╗")
  console.log("║   CORRECCIÓN SIMPLIFICADA DE DUPLICADOS                  ║")
  console.log("╚═══════════════════════════════════════════════════════════╝")

  const sorteoId = process.argv[2]
  const modo = process.argv[3] || "dry-run"

  if (!sorteoId) {
    console.error(
      "\n❌ Uso: npx tsx scripts/fix-duplicates-simple.ts <sorteo_id> [dry-run|execute]"
    )
    process.exit(1)
  }

  const dryRun = modo !== "execute"

  try {
    // Diagnóstico
    const stats = await diagnosticoRapido(sorteoId)
    if (!stats || stats.numeros_duplicados === 0) {
      console.log("\n✅ No hay duplicados que corregir")
      return
    }

    // Corregir
    await corregirDuplicados(sorteoId, dryRun)

    // Verificar resultado (si no fue dry-run)
    if (!dryRun) {
      console.log("\n🔍 Verificando resultado...")
      await diagnosticoRapido(sorteoId)
    }
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message)
    process.exit(1)
  }
}

main()
