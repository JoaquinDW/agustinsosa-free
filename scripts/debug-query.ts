/**
 * Debug: verificar si los compradores específicos están en la query
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  const sorteoActivo = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"

  const idsProblema = [
    "17995b95-3cb6-4d46-b2bc-8ded2c4d53b6", // Pablo Gerardo Sotelo
    "5c046452-69d2-45b4-b548-63e2a58e4d24", // Saul Exequiel Escalada
    "620d36ad-d90c-4f29-ac92-2a28528c0a99", // Matias Natanael Gomez
    "e7833ffa-c07f-4d68-bf83-65425e9740c3", // Joaquín Testa
  ]

  console.log("\n🔍 DEBUG: ¿Están estos compradores en la query general?")
  console.log("═".repeat(60))

  // Query general (la misma que usan los otros scripts)
  const { data: compradores, error } = await supabase
    .from("compradores")
    .select("id, nombre, created_at, numeros_asignados")
    .eq("sorteo_id", sorteoActivo)
    .eq("estado_pago", "pagado")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }

  console.log(`Total compradores obtenidos: ${compradores.length}`)
  console.log()

  // Verificar si cada ID problemático está en la lista
  for (const idProblema of idsProblema) {
    const encontrado = compradores.find((c) => c.id === idProblema)

    if (encontrado) {
      console.log(`✓ ID ${idProblema.substring(0, 8)}... ENCONTRADO`)
      console.log(`  Nombre: ${encontrado.nombre}`)
      console.log(`  Números: ${encontrado.numeros_asignados?.length || 0}`)
      console.log(`  ¿Tiene 6582?: ${encontrado.numeros_asignados?.includes(6582) ? "SÍ" : "NO"}`)
    } else {
      console.log(`✗ ID ${idProblema.substring(0, 8)}... NO ENCONTRADO`)
    }
  }

  console.log("\n" + "═".repeat(60))

  // Contar manualmente el 6582
  let contador6582 = 0
  const compradoresCon6582: any[] = []

  for (const c of compradores) {
    if (c.numeros_asignados?.includes(6582)) {
      contador6582++
      compradoresCon6582.push(c)
    }
  }

  console.log(`\n📊 CONTEO MANUAL DEL NÚMERO 6582:`)
  console.log(`   Aparece en ${contador6582} comprador(es)`)

  if (compradoresCon6582.length > 0) {
    console.log(`\n   Detalles:`)
    compradoresCon6582.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nombre}`)
      console.log(`      ID: ${c.id}`)
    })
  }

  console.log("\n" + "═".repeat(60))
}

debug()
