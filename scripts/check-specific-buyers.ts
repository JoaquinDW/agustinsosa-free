/**
 * Verificar compradores específicos
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBuyers(sorteoId: string) {
  console.log("🔍 Buscando compradores específicos\n")

  // Buscar por nombre
  const { data: joaquin } = await supabase
    .from("compradores")
    .select("*")
    .eq("sorteo_id", sorteoId)
    .ilike("nombre", "%Joaquin%Testa%")

  const { data: diego } = await supabase
    .from("compradores")
    .select("*")
    .eq("sorteo_id", sorteoId)
    .ilike("nombre", "%Diego%Balzarini%")

  console.log("Joaquin Testa:")
  if (joaquin && joaquin.length > 0) {
    for (const c of joaquin) {
      console.log(`  ID: ${c.id}`)
      console.log(`  Nombre: ${c.nombre}`)
      console.log(`  Estado: ${c.estado_pago}`)
      console.log(`  Chances: ${c.cantidad_chances}`)
      console.log(`  Números: ${c.numeros_asignados.join(", ")}`)
      console.log(`  ¿Tiene 4699?: ${c.numeros_asignados.includes(4699) ? "SÍ" : "NO"}`)
    }
  } else {
    console.log("  No encontrado")
  }

  console.log("\nDiego Balzarini:")
  if (diego && diego.length > 0) {
    for (const c of diego) {
      console.log(`  ID: ${c.id}`)
      console.log(`  Nombre: ${c.nombre}`)
      console.log(`  Estado: ${c.estado_pago}`)
      console.log(`  Chances: ${c.cantidad_chances}`)
      console.log(`  Números: ${c.numeros_asignados.join(", ")}`)
      console.log(`  ¿Tiene 4699?: ${c.numeros_asignados.includes(4699) ? "SÍ" : "NO"}`)
    }
  } else {
    console.log("  No encontrado")
  }

  // Buscar quién tiene el 4699
  console.log("\n\n🔢 ¿Quién tiene el número 4699?")

  const { data: todos } = await supabase
    .from("compradores")
    .select("*")
    .eq("sorteo_id", sorteoId)
    .eq("estado_pago", "pagado")

  const conEl4699 = []
  for (const c of todos || []) {
    if (c.numeros_asignados.includes(4699)) {
      conEl4699.push(c)
    }
  }

  if (conEl4699.length === 0) {
    console.log("  Nadie tiene el 4699")
  } else {
    console.log(`  ${conEl4699.length} comprador(es) tienen el 4699:`)
    for (const c of conEl4699) {
      console.log(`    - ${c.nombre} (${c.estado_pago}, ${new Date(c.created_at).toLocaleString()})`)
    }
  }
}

const sorteoId = process.argv[2]
if (!sorteoId) {
  console.error("Uso: npx tsx scripts/check-specific-buyers.ts <sorteo_id>")
  process.exit(1)
}

checkBuyers(sorteoId)
