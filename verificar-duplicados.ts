import { config } from "dotenv"
config()

import { supabase } from "./lib/supabase"

async function verificarNumerosDuplicados() {
  console.log("🔍 Buscando números duplicados...\n")

  try {
    // Obtener todos los compradores con estado pagado
    const { data: compradores, error } = await supabase
      .from("compradores")
      .select(
        "id, nombre, sorteo_id, numeros_asignados, cantidad_chances, estado_pago, created_at"
      )
      .eq("estado_pago", "pagado")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Error:", error)
      return
    }

    if (!compradores || compradores.length === 0) {
      console.log("⚠️ No se encontraron compradores")
      return
    }

    console.log(`📊 Total compradores pagados: ${compradores.length}\n`)

    // Crear un mapa de número -> compradores que lo tienen
    const mapaNumeros = new Map<
      number,
      Array<{
        id: string
        nombre: string
        sorteo_id: string
        created_at: string
        cantidad_chances: number
      }>
    >()

    compradores.forEach((comprador) => {
      comprador.numeros_asignados.forEach((numero: number) => {
        if (!mapaNumeros.has(numero)) {
          mapaNumeros.set(numero, [])
        }
        mapaNumeros.get(numero)!.push({
          id: comprador.id,
          nombre: comprador.nombre,
          sorteo_id: comprador.sorteo_id,
          created_at: comprador.created_at,
          cantidad_chances: comprador.cantidad_chances,
        })
      })
    })

    // Buscar duplicados
    const duplicados: Array<{
      numero: number
      compradores: Array<any>
    }> = []

    mapaNumeros.forEach((compradores, numero) => {
      if (compradores.length > 1) {
        duplicados.push({ numero, compradores })
      }
    })

    if (duplicados.length === 0) {
      console.log("✅ No se encontraron números duplicados")
      return
    }

    console.log(`🚨 ENCONTRADOS ${duplicados.length} NÚMEROS DUPLICADOS:\n`)

    duplicados.forEach(({ numero, compradores }) => {
      console.log(`📍 Número: ${numero}`)
      compradores.forEach((c, index) => {
        console.log(`   ${index + 1}. ${c.nombre}`)
        console.log(`      - ID: ${c.id}`)
        console.log(`      - Sorteo: ${c.sorteo_id}`)
        console.log(
          `      - Fecha: ${new Date(c.created_at).toLocaleString("es-AR")}`
        )
        console.log(`      - Chances: ${c.cantidad_chances}`)
      })
      console.log()
    })

    // Buscar específicamente el 4699
    console.log("\n🔎 ANÁLISIS ESPECÍFICO DEL NÚMERO 4699:")
    const duplicado4699 = duplicados.find((d) => d.numero === 4699)
    if (duplicado4699) {
      console.log("❗ Confirmado: El número 4699 está duplicado")
      duplicado4699.compradores.forEach((c, index) => {
        console.log(`\n${index + 1}. ${c.nombre}`)
        console.log(
          `   Fecha de compra: ${new Date(c.created_at).toLocaleString(
            "es-AR"
          )}`
        )

        // Obtener todos los números de este comprador
        const compradorCompleto = compradores.find((comp) => comp.id === c.id)
        if (compradorCompleto) {
          console.log(
            `   Todos sus números: ${compradorCompleto.numeros_asignados
              .slice(0, 10)
              .join(", ")}${
              compradorCompleto.numeros_asignados.length > 10 ? "..." : ""
            }`
          )
        }
      })
    } else {
      console.log("⚠️ El número 4699 NO aparece en los duplicados encontrados")
    }
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

verificarNumerosDuplicados()
