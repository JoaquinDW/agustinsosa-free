/**
 * Verificar compradores específicos por ID
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSpecificIds() {
  // IDs de tu query SQL
  const ids = [
    "17995b95-3cb6-4d46-b2bc-8ded2c4d53b6", // Pablo Gerardo Sotelo
    "5c046452-69d2-45b4-b548-63e2a58e4d24", // Saul Exequiel Escalada
    "620d36ad-d90c-4f29-ac92-2a28528c0a99", // Matias Natanael Gomez
    "e7833ffa-c07f-4d68-bf83-65425e9740c3", // Joaquín Testa
  ]

  console.log("\n🔍 VERIFICANDO COMPRADORES ESPECÍFICOS")
  console.log("═".repeat(60))

  for (const id of ids) {
    const { data, error } = await supabase
      .from("compradores")
      .select("id, nombre, sorteo_id, estado_pago, created_at, numeros_asignados")
      .eq("id", id)
      .single()

    if (error) {
      console.log(`\n❌ ID: ${id}`)
      console.log(`   Error: ${error.message}`)
      continue
    }

    if (!data) {
      console.log(`\n⚠️  ID: ${id}`)
      console.log(`   No encontrado`)
      continue
    }

    const tiene6582 = data.numeros_asignados?.includes(6582)

    console.log(`\n✓ ${data.nombre}`)
    console.log(`   ID: ${id}`)
    console.log(`   Sorteo: ${data.sorteo_id}`)
    console.log(`   Estado: ${data.estado_pago}`)
    console.log(`   Fecha: ${new Date(data.created_at).toLocaleString()}`)
    console.log(`   Total números: ${data.numeros_asignados?.length || 0}`)
    console.log(`   ¿Tiene 6582?: ${tiene6582 ? "SÍ" : "NO"}`)
    if (tiene6582) {
      const indice = data.numeros_asignados.indexOf(6582)
      console.log(`   Posición del 6582: índice ${indice}`)
    }
  }

  console.log("\n" + "═".repeat(60))
}

checkSpecificIds()
