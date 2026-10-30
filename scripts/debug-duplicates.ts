/**
 * Script de debugging para entender el problema de duplicados
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug(sorteoId: string) {
  console.log("🔍 DEBUGGING DUPLICADOS\n")

  // Obtener compradores
  const { data: compradores } = await supabase
    .from("compradores")
    .select("id, nombre, cantidad_chances, numeros_asignados")
    .eq("sorteo_id", sorteoId)
    .eq("estado_pago", "pagado")
    .limit(10)

  console.log(`Mostrando primeros 10 compradores:\n`)

  for (const c of compradores || []) {
    const numerosUnicos = new Set(c.numeros_asignados)
    const tieneDuplicadosInternos = numerosUnicos.size !== c.numeros_asignados.length

    console.log(`${c.nombre}:`)
    console.log(`  Cantidad esperada: ${c.cantidad_chances}`)
    console.log(`  Números asignados: ${c.numeros_asignados.length}`)
    console.log(`  Números únicos: ${numerosUnicos.size}`)
    console.log(`  ¿Duplicados internos?: ${tieneDuplicadosInternos ? "SÍ" : "NO"}`)
    console.log(`  Números: ${c.numeros_asignados.slice(0, 20).join(", ")}${c.numeros_asignados.length > 20 ? "..." : ""}`)
    console.log()
  }

  // Contar todos los números globalmente
  const { data: todosCompradores } = await supabase
    .from("compradores")
    .select("numeros_asignados")
    .eq("sorteo_id", sorteoId)
    .eq("estado_pago", "pagado")

  const todosLosNumeros: number[] = []
  for (const c of todosCompradores || []) {
    todosLosNumeros.push(...c.numeros_asignados)
  }

  const numerosUnicos = new Set(todosLosNumeros)

  console.log(`\n📊 ESTADÍSTICAS GLOBALES:`)
  console.log(`Total números asignados (con repeticiones): ${todosLosNumeros.length}`)
  console.log(`Números únicos diferentes: ${numerosUnicos.size}`)
  console.log(`Diferencia (duplicados): ${todosLosNumeros.length - numerosUnicos.size}`)

  // Encontrar qué números están duplicados
  const conteoNumeros = new Map<number, number>()
  for (const num of todosLosNumeros) {
    conteoNumeros.set(num, (conteoNumeros.get(num) || 0) + 1)
  }

  const duplicados = Array.from(conteoNumeros.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])

  console.log(`\n🔢 NÚMEROS CON MÁS DUPLICADOS (top 20):`)
  for (let i = 0; i < Math.min(20, duplicados.length); i++) {
    const [numero, veces] = duplicados[i]
    console.log(`  Número ${numero}: aparece ${veces} veces`)
  }

  // Buscar compradores que tienen el número más duplicado
  if (duplicados.length > 0) {
    const [numeroMasDuplicado, veces] = duplicados[0]
    console.log(`\n🔍 ¿Quiénes tienen el número ${numeroMasDuplicado}? (aparece ${veces} veces)`)

    const { data: compradoresConEseNumero } = await supabase
      .from("compradores")
      .select("id, nombre, created_at, numeros_asignados")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")

    for (const c of compradoresConEseNumero || []) {
      if (c.numeros_asignados.includes(numeroMasDuplicado)) {
        const cuantasVeces = c.numeros_asignados.filter((n: number) => n === numeroMasDuplicado).length
        console.log(`  - ${c.nombre} (${new Date(c.created_at).toLocaleString()}): tiene el ${numeroMasDuplicado} ${cuantasVeces} vez/veces`)
      }
    }
  }
}

const sorteoId = process.argv[2]
if (!sorteoId) {
  console.error("Uso: npx tsx scripts/debug-duplicates.ts <sorteo_id>")
  process.exit(1)
}

debug(sorteoId)
