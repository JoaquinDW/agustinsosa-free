#!/usr/bin/env tsx

/**
 * Script para probar la lógica de números ganadores con diferentes casos
 */

function testLogicaNumeros() {
  console.log("🧪 Probando lógica de números ganadores...\n")

  const totalChances = 9999 // Rango completo del sorteo
  const casos = [
    "1857", // Dentro del rango
    "0087", // Dentro del rango
    "0150", // Dentro del rango
    "0001", // Dentro del rango
    "0000", // Borde inferior
    "9999", // Borde superior
    "12345", // Fuera del rango
  ]

  casos.forEach((numeroOriginal, index) => {
    console.log(`📍 Caso ${index + 1}: Número original "${numeroOriginal}"`)

    const numeroInt = parseInt(numeroOriginal.slice(-4))
    console.log(`   Últimos 4 dígitos: ${numeroOriginal.slice(-4)}`)
    console.log(`   Convertido a int: ${numeroInt}`)

    // Aplicar la lógica corregida
    let numeroFinal = numeroInt
    if (numeroInt > totalChances || numeroInt < 0) {
      numeroFinal = numeroInt % (totalChances + 1)
      console.log(`   🔄 Fuera de rango → Ajustado a: ${numeroFinal}`)
    } else {
      console.log(`   ✅ Dentro del rango → Ganador: ${numeroFinal}`)
    }
    console.log("")
  })

  console.log("✨ Test de lógica completado")
}

if (require.main === module) {
  testLogicaNumeros()
}
