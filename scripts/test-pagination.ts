/**
 * Test: verificar si la paginación funciona correctamente
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPagination() {
  const sorteoId = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"

  console.log("\n🔍 TEST DE PAGINACIÓN")
  console.log("═".repeat(60))

  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true
  let pageNumber = 1

  while (hasMore) {
    console.log(`\nPágina ${pageNumber}: obteniendo registros ${from} a ${from + pageSize - 1}...`)

    const { data, error } = await supabase
      .from("compradores")
      .select("*")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("❌ Error:", error)
      break
    }

    if (data && data.length > 0) {
      console.log(`   ✓ Obtenidos: ${data.length} registros`)
      allData = [...allData, ...data]
      from += pageSize
      pageNumber++

      // Si recibimos menos de pageSize, ya no hay más datos
      if (data.length < pageSize) {
        console.log(`   ✓ Última página (recibimos menos de ${pageSize})`)
        hasMore = false
      }
    } else {
      console.log(`   ✓ No hay más datos`)
      hasMore = false
    }
  }

  console.log("\n" + "═".repeat(60))
  console.log(`📊 RESULTADO FINAL:`)
  console.log(`   Total compradores obtenidos: ${allData.length}`)
  console.log(`   Total páginas: ${pageNumber - 1}`)

  // Verificar si tenemos los IDs problemáticos
  const idsProblema = [
    "17995b95-3cb6-4d46-b2bc-8ded2c4d53b6", // Pablo Gerardo Sotelo
    "5c046452-69d2-45b4-b548-63e2a58e4d24", // Saul Exequiel Escalada
    "620d36ad-d90c-4f29-ac92-2a28528c0a99", // Matias Natanael Gomez
    "e7833ffa-c07f-4d68-bf83-65425e9740c3", // Joaquín Testa
  ]

  console.log(`\n🔍 ¿ESTÁN LOS COMPRADORES PROBLEMÁTICOS?`)
  for (const idProblema of idsProblema) {
    const encontrado = allData.find((c) => c.id === idProblema)
    if (encontrado) {
      console.log(`   ✓ ${encontrado.nombre}`)
    } else {
      console.log(`   ✗ ID ${idProblema.substring(0, 8)}... NO ENCONTRADO`)
    }
  }

  // Buscar el 6582
  const compradoresCon6582 = allData.filter((c) => c.numeros_asignados?.includes(6582))
  console.log(`\n📊 NÚMERO 6582:`)
  console.log(`   Aparece en ${compradoresCon6582.length} comprador(es)`)

  if (compradoresCon6582.length > 0) {
    compradoresCon6582.forEach((c) => {
      console.log(`   - ${c.nombre}`)
    })
  }

  console.log("\n" + "═".repeat(60))
}

testPagination()
