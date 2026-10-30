/**
 * Diagnóstico rápido de duplicados
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnostico() {
  const sorteoId = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"

  console.log("\n🔍 DIAGNÓSTICO RÁPIDO DE DUPLICADOS")
  console.log("═".repeat(60))

  // Obtener todos los compradores pagados del sorteo activo
  const { data: compradores, error } = await supabase
    .from("compradores")
    .select("id, nombre, created_at, numeros_asignados, cantidad_chances")
    .eq("sorteo_id", sorteoId)
    .eq("estado_pago", "pagado")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }

  console.log(`Total compradores (pagado): ${compradores.length}`)

  // Contar todos los números
  const todosLosNumeros: number[] = []
  for (const c of compradores) {
    todosLosNumeros.push(...c.numeros_asignados)
  }

  const numerosUnicos = new Set(todosLosNumeros)

  console.log(`Total números asignados: ${todosLosNumeros.length}`)
  console.log(`Números únicos: ${numerosUnicos.size}`)
  console.log(`Números duplicados: ${todosLosNumeros.length - numerosUnicos.size}`)

  // Encontrar qué números están duplicados
  const conteoNumeros = new Map<number, number>()
  for (const num of todosLosNumeros) {
    conteoNumeros.set(num, (conteoNumeros.get(num) || 0) + 1)
  }

  const duplicados = Array.from(conteoNumeros.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])

  console.log(`\n🔢 Total de números que aparecen más de una vez: ${duplicados.length}`)

  if (duplicados.length > 0) {
    console.log(`\n📊 Top 20 números más duplicados:`)
    for (let i = 0; i < Math.min(20, duplicados.length); i++) {
      const [numero, veces] = duplicados[i]
      console.log(`   ${numero}: aparece ${veces} veces`)
    }
  }

  console.log("\n" + "═".repeat(60))
}

diagnostico()
