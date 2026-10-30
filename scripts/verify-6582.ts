/**
 * Verificar específicamente el número 6582
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  const sorteoActivo = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"
  const numeroProblema = 6582

  console.log("\n🔍 VERIFICACIÓN DEL NÚMERO 6582")
  console.log("═".repeat(60))
  console.log(`Sorteo activo: ${sorteoActivo}`)
  console.log(`Número a verificar: ${numeroProblema}`)
  console.log()

  // Buscar TODOS los compradores con estado pagado que tengan el 6582
  const { data: compradores, error } = await supabase
    .from("compradores")
    .select("id, nombre, sorteo_id, estado_pago, created_at, numeros_asignados")
    .eq("estado_pago", "pagado")

  if (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }

  // Filtrar los que tienen el número 6582
  const compradoresConNumero = compradores.filter((c) =>
    c.numeros_asignados?.includes(numeroProblema)
  )

  console.log(`Total compradores con ${numeroProblema} (todos los sorteos): ${compradoresConNumero.length}`)
  console.log()

  // Agrupar por sorteo
  const porSorteo = compradoresConNumero.reduce((acc, c) => {
    if (!acc[c.sorteo_id]) {
      acc[c.sorteo_id] = []
    }
    acc[c.sorteo_id].push(c)
    return acc
  }, {} as Record<string, any[]>)

  console.log("📊 POR SORTEO:")
  for (const [sorteoId, comps] of Object.entries(porSorteo)) {
    const esActivo = sorteoId === sorteoActivo
    console.log(`\n${esActivo ? "🎯 " : ""}Sorteo ${sorteoId.substring(0, 8)}... ${esActivo ? "(ACTIVO)" : ""}`)
    console.log(`   ${comps.length} comprador(es) con el número ${numeroProblema}:`)
    comps.forEach((c) => {
      console.log(`   - ${c.nombre} (${new Date(c.created_at).toLocaleString()})`)
    })
  }

  // Ahora verificar solo en el sorteo activo
  const enSorteoActivo = compradoresConNumero.filter((c) => c.sorteo_id === sorteoActivo)

  console.log(`\n${"═".repeat(60)}`)
  console.log(`🎯 EN EL SORTEO ACTIVO:`)
  console.log(`   ${enSorteoActivo.length} comprador(es) tienen el número ${numeroProblema}`)

  if (enSorteoActivo.length > 1) {
    console.log(`\n   ⚠️  ¡DUPLICADO CONFIRMADO! El número ${numeroProblema} está asignado a ${enSorteoActivo.length} personas diferentes:`)
    enSorteoActivo.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nombre}`)
      console.log(`      ID: ${c.id}`)
      console.log(`      Fecha: ${new Date(c.created_at).toLocaleString()}`)
    })
  }

  console.log("\n" + "═".repeat(60))
}

verify()
