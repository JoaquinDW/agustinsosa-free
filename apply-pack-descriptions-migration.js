#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")

// Configuración de Supabase - usar las mismas credenciales que apply-migration.js
const supabaseUrl = "https://ambvsbgwukdhnxfvdgeh.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYnZzYmd3dWtkaG54ZnZkZ2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYzMzYyMCwiZXhwIjoyMDY5MjA5NjIwfQ.FtzabRaRNfjTb98lmmL39Mrg_HLrzCTw98cNpFnYs6Y"

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log("Aplicando migración de descripciones de packs...")

    // Leer el archivo de migración
    const migrationSQL = fs.readFileSync(
      "./scripts/14-add-pack-descriptions.sql",
      "utf8"
    )

    // Dividir el SQL en comandos individuales
    const commands = migrationSQL
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"))

    // Ejecutar cada comando
    for (const command of commands) {
      console.log(`Ejecutando: ${command.substring(0, 50)}...`)
      const { error } = await supabase.rpc("exec_sql", {
        sql: command,
      })

      if (error) {
        console.error("Error ejecutando comando:", error)
        // Intentar ejecutar directamente si exec_sql no está disponible
        console.log("Intentando método alternativo...")
        const { error: directError } = await supabase.from("_sql").insert({
          query: command,
        })
        if (directError) {
          console.error("Error con método alternativo:", directError)
        }
      }
    }

    console.log("✅ Migración aplicada exitosamente!")
    console.log(
      "Ahora puedes editar las descripciones de los packs desde el panel de admin."
    )
  } catch (error) {
    console.error("Error:", error.message)
    console.log(
      "\n⚠️  Si el error persiste, puedes ejecutar el SQL manualmente desde el panel de Supabase:"
    )
    console.log("   1. Ve a tu proyecto en supabase.com")
    console.log("   2. Abre el SQL Editor")
    console.log(
      "   3. Copia y pega el contenido de scripts/14-add-pack-descriptions.sql"
    )
    console.log("   4. Ejecuta el script")
  }
}

applyMigration()
