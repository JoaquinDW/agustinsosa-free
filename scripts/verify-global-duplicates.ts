/**
 * Verificar que NO haya duplicados globalmente después de aplicar los cambios
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyGlobal() {
  const sorteoId = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"

  console.log("\n🔍 VERIFICACIÓN GLOBAL DE DUPLICADOS")
  console.log("═".repeat(60))

  // Leer el CSV con los cambios propuestos
  const csvPath = path.join(
    process.cwd(),
    "scripts",
    "reporte-cambios-duplicados-2026-01-08.csv"
  )
  const csvContent = fs.readFileSync(csvPath, "utf-8")
  const lines = csvContent.split("\n").slice(1) // Skip header

  const cambiosPorId: Record<string, number[]> = {}
  const nombresEnCSV = new Set<string>()

  for (const line of lines) {
    if (!line.trim()) continue

    const nombreMatch = line.match(/^"([^"]+)"/)
    if (!nombreMatch) continue

    const nombre = nombreMatch[1]
    nombresEnCSV.add(nombre)

    // Extraer números finales (última columna entre comillas)
    const numerosMatch = line.match(/"([^"]+)"$/)
    if (numerosMatch) {
      const numeros = numerosMatch[1].split(", ").map((n) => parseInt(n.trim()))
      cambiosPorId[nombre] = numeros
    }
  }

  console.log(
    `Compradores con cambios en CSV: ${Object.keys(cambiosPorId).length}`
  )

  // Obtener TODOS los compradores de la base de datos
  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("compradores")
      .select("id, nombre, numeros_asignados")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("❌ Error:", error)
      process.exit(1)
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

  console.log(`Total compradores en BD: ${allData.length}`)
  console.log()

  // Construir el estado final simulado
  const todosLosNumerosFinales: number[] = []
  let compradoresActualizados = 0
  let compradoresSinCambios = 0

  for (const comprador of allData) {
    if (nombresEnCSV.has(comprador.nombre)) {
      // Este comprador tiene cambios propuestos
      const numerosNuevos = cambiosPorId[comprador.nombre]
      if (numerosNuevos) {
        todosLosNumerosFinales.push(...numerosNuevos)
        compradoresActualizados++
      } else {
        todosLosNumerosFinales.push(...comprador.numeros_asignados)
      }
    } else {
      // Este comprador NO tiene cambios, mantiene sus números actuales
      todosLosNumerosFinales.push(...comprador.numeros_asignados)
      compradoresSinCambios++
    }
  }

  console.log(`Compradores que recibirán cambios: ${compradoresActualizados}`)
  console.log(`Compradores que mantienen sus números: ${compradoresSinCambios}`)
  console.log()

  // Verificar duplicados en el estado final
  const numerosUnicos = new Set(todosLosNumerosFinales)

  console.log("📊 ESTADO FINAL SIMULADO:")
  console.log(`   Total números asignados: ${todosLosNumerosFinales.length}`)
  console.log(`   Números únicos: ${numerosUnicos.size}`)
  console.log(
    `   Números duplicados: ${
      todosLosNumerosFinales.length - numerosUnicos.size
    }`
  )

  if (todosLosNumerosFinales.length === numerosUnicos.size) {
    console.log(
      "\n✅ ¡PERFECTO! NO HAY DUPLICADOS después de aplicar los cambios"
    )
  } else {
    console.log("\n❌ ADVERTENCIA: Todavía hay duplicados")

    // Encontrar qué números están duplicados
    const contador = new Map<number, number>()
    for (const num of todosLosNumerosFinales) {
      contador.set(num, (contador.get(num) || 0) + 1)
    }

    const duplicados = Array.from(contador.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])

    console.log(`\nPrimeros 10 números duplicados:`)
    for (let i = 0; i < Math.min(10, duplicados.length); i++) {
      const [numero, veces] = duplicados[i]
      console.log(`   ${numero}: aparece ${veces} veces`)
    }
  }

  console.log("\n" + "═".repeat(60))
}

verifyGlobal()
