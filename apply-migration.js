#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")

// Configuración de Supabase desde .env
const supabaseUrl = "https://ambvsbgwukdhnxfvdgeh.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYnZzYmd3dWtkaG54ZnZkZ2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYzMzYyMCwiZXhwIjoyMDY5MjA5NjIwfQ.FtzabRaRNfjTb98lmmL39Mrg_HLrzCTw98cNpFnYs6Y"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log("Aplicando migración de transferencias...")

    // Leer el archivo de migración
    const migrationSQL = fs.readFileSync(
      "./scripts/05-add-transferencia-fields.sql",
      "utf8"
    )

    // Ejecutar la migración
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    })

    if (error) {
      console.error("Error aplicando migración:", error)
      return
    }

    console.log("✅ Migración aplicada exitosamente!")
    console.log("Ahora puedes usar la funcionalidad de transferencias.")
  } catch (error) {
    console.error("Error:", error.message)
  }
}

applyMigration()
