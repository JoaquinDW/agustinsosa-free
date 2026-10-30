#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = "https://ambvsbgwukdhnxfvdgeh.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYnZzYmd3dWtkaG54ZnZkZ2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYzMzYyMCwiZXhwIjoyMDY5MjA5NjIwfQ.FtzabRaRNfjTb98lmmL39Mrg_HLrzCTw98cNpFnYs6Y"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyMigration() {
  try {
    console.log("Verificando estructura de la tabla compradores...")

    // Consultar la información de columnas de la tabla
    const { data, error } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_name", "compradores")
      .eq("table_schema", "public")

    if (error) {
      console.error("Error consultando esquema:", error)
      return
    }

    console.log("Columnas encontradas:")
    data.forEach((col) => {
      console.log(
        `- ${col.column_name} (${col.data_type}) ${
          col.is_nullable === "YES" ? "NULL" : "NOT NULL"
        }`
      )
    })

    // Verificar específicamente las columnas de transferencia
    const transferCols = data.filter((col) =>
      [
        "metodo_pago",
        "comprobante_url",
        "estado_transferencia",
        "fecha_transferencia",
        "admin_revisor",
        "notas_admin",
      ].includes(col.column_name)
    )

    if (transferCols.length === 6) {
      console.log("✅ Todas las columnas de transferencia están presentes")
    } else {
      console.log(
        "❌ Faltan columnas de transferencia:",
        6 - transferCols.length
      )
      console.log(
        "Columnas encontradas:",
        transferCols.map((c) => c.column_name)
      )
    }
  } catch (error) {
    console.error("Error:", error.message)
  }
}

verifyMigration()
