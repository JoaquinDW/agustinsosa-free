/**
 * Encontrar TODOS los números duplicados con detalles
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function findAllDuplicates() {
  const sorteoActivo = "c0cb539f-e867-4475-a9ca-b6c6e345b4ba"

  console.log("\n🔍 BUSCANDO TODOS LOS DUPLICADOS")
  console.log("═".repeat(60))

  // Obtener TODOS los compradores pagados
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

  console.log(`Total compradores (pagado): ${compradores.length}`)
  console.log()

  // Crear un mapa: número -> lista de compradores que lo tienen
  const numeroACompradores = new Map<number, Array<{ id: string; nombre: string; created_at: string }>>()

  for (const comprador of compradores) {
    if (!comprador.numeros_asignados) continue

    for (const numero of comprador.numeros_asignados) {
      if (!numeroACompradores.has(numero)) {
        numeroACompradores.set(numero, [])
      }
      numeroACompradores.get(numero)!.push({
        id: comprador.id,
        nombre: comprador.nombre,
        created_at: comprador.created_at,
      })
    }
  }

  // Encontrar números que aparecen en más de un comprador
  const numerosDuplicados: Array<[number, Array<{ id: string; nombre: string; created_at: string }>]> = []

  for (const [numero, owners] of numeroACompradores) {
    if (owners.length > 1) {
      numerosDuplicados.push([numero, owners])
    }
  }

  // Ordenar por cantidad de duplicados (descendente)
  numerosDuplicados.sort((a, b) => b[1].length - a[1].length)

  console.log(`🔢 NÚMEROS DUPLICADOS ENCONTRADOS: ${numerosDuplicados.length}`)
  console.log()

  if (numerosDuplicados.length === 0) {
    console.log("✅ ¡No hay números duplicados!")
    return
  }

  console.log("📊 DETALLES DE DUPLICADOS:")
  console.log("─".repeat(60))

  // Mostrar todos los duplicados (o los primeros 50)
  const limite = Math.min(50, numerosDuplicados.length)
  for (let i = 0; i < limite; i++) {
    const [numero, owners] = numerosDuplicados[i]
    console.log(`\n${i + 1}. Número ${numero} - aparece ${owners.length} veces:`)
    owners.forEach((owner) => {
      console.log(`   - ${owner.nombre} (${new Date(owner.created_at).toLocaleString()})`)
    })
  }

  if (numerosDuplicados.length > limite) {
    console.log(`\n... y ${numerosDuplicados.length - limite} números duplicados más.`)
  }

  // Calcular estadísticas
  const totalDuplicaciones = numerosDuplicados.reduce((sum, [_, owners]) => sum + (owners.length - 1), 0)

  console.log("\n" + "═".repeat(60))
  console.log("📊 ESTADÍSTICAS:")
  console.log(`   Números únicos duplicados: ${numerosDuplicados.length}`)
  console.log(`   Total de duplicaciones: ${totalDuplicaciones}`)
  console.log(`   (cada número duplicado se cuenta tantas veces como aparece - 1)`)

  console.log("\n" + "═".repeat(60))
}

findAllDuplicates()
