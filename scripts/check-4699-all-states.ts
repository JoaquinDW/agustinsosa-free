/**
 * Script para verificar TODOS los compradores con número 4699
 * independiente del estado de pago
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables de entorno no configuradas")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNumber4699() {
  const sorteoId = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"
  const numeroABuscar = 4699

  console.log("\n🔍 BUSCANDO NÚMERO 4699 EN TODOS LOS COMPRADORES")
  console.log("═".repeat(60))
  console.log(`Sorteo ID: ${sorteoId}`)
  console.log(`Número buscado: ${numeroABuscar}`)
  console.log()

  // Obtener TODOS los compradores del sorteo (sin filtrar por estado_pago)
  const { data: compradores, error } = await supabase
    .from("compradores")
    .select("*")
    .eq("sorteo_id", sorteoId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }

  console.log(`Total compradores en sorteo (TODOS los estados): ${compradores.length}`)
  console.log()

  // Filtrar los que tienen el número 4699
  const compradoresConNumero = compradores.filter((c) =>
    c.numeros_asignados?.includes(numeroABuscar)
  )

  console.log(`Compradores con número ${numeroABuscar}: ${compradoresConNumero.length}`)
  console.log()

  if (compradoresConNumero.length > 0) {
    console.log("DETALLES:")
    console.log("─".repeat(60))
    compradoresConNumero.forEach((c, index) => {
      console.log(`\n${index + 1}. ${c.nombre}`)
      console.log(`   ID: ${c.id}`)
      console.log(`   Email: ${c.email}`)
      console.log(`   Estado pago: ${c.estado_pago}`)
      console.log(`   Cantidad chances: ${c.cantidad_chances}`)
      console.log(`   Fecha compra: ${new Date(c.created_at).toLocaleString()}`)
      console.log(`   Números asignados: ${c.numeros_asignados?.length || 0}`)
      console.log(`   ¿Tiene ${numeroABuscar}?: ${c.numeros_asignados?.includes(numeroABuscar) ? "SÍ" : "NO"}`)

      // Contar cuántas veces aparece el número en su array
      const veces = c.numeros_asignados?.filter((n: number) => n === numeroABuscar).length || 0
      if (veces > 1) {
        console.log(`   ⚠️  DUPLICADO INTERNO: El número ${numeroABuscar} aparece ${veces} veces en su array`)
      }
    })
  }

  console.log("\n" + "═".repeat(60))

  // Estadísticas por estado de pago
  console.log("\n📊 ESTADÍSTICAS POR ESTADO DE PAGO:")
  const estadisticas = compradores.reduce(
    (acc, c) => {
      const estado = c.estado_pago || "sin_estado"
      if (!acc[estado]) {
        acc[estado] = 0
      }
      acc[estado]++
      return acc
    },
    {} as Record<string, number>
  )

  Object.entries(estadisticas).forEach(([estado, cantidad]) => {
    console.log(`   ${estado}: ${cantidad} compradores`)
  })

  console.log()
}

checkNumber4699()
