#!/usr/bin/env tsx

/**
 * Script simple para probar rápidamente el scrapper sin base de datos
 */

async function pruebaRapida() {
  console.log("🚀 Prueba rápida del sistema...")

  try {
    console.log("\n1️⃣ Probando scrapper de lotería...")
    const { obtenerPrimerNumero } = await import("../lib/sorteoScrapper")

    const numero = await obtenerPrimerNumero()

    if (numero) {
      console.log(`✅ Número obtenido: ${numero}`)
      console.log(`🎯 Número ganador: ${numero} (se usa exactamente como está)`)
    } else {
      console.log("❌ No se pudo obtener el número")
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`)
  }

  console.log("\n✨ Prueba completada")
}

if (require.main === module) {
  pruebaRapida()
}
