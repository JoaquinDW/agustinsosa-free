#!/usr/bin/env tsx

/**
 * Script para ejecutar diariamente y verificar sorteos pendientes
 * Este script debería ejecutarse una vez por día (ej: via cron job)
 */

import { verificarYEjecutarSorteos } from "../lib/sorteoScrapper"

async function main() {
  console.log(
    "🕐",
    new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      dateStyle: "full",
      timeStyle: "short",
    })
  )

  console.log("🚀 Iniciando verificación diaria de sorteos...")

  try {
    await verificarYEjecutarSorteos()
    console.log("✅ Verificación completada exitosamente")
  } catch (error) {
    console.error("❌ Error en la verificación diaria:", error)
    process.exit(1)
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main()
}
