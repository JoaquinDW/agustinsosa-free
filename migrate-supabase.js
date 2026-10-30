import { supabase } from "./lib/supabase.js"

async function migrate() {
  try {
    console.log("Ejecutando migración con Supabase...")

    // Verificar columnas existentes
    const { data: columns, error: columnError } = await supabase.rpc(
      "get_table_columns",
      { table_name: "compradores" }
    )

    if (columnError) {
      console.log("No se pudo verificar columnas, intentando agregar...")
    } else {
      console.log("Columnas existentes:", columns)
    }

    // Intentar agregar las columnas usando SQL directo
    const { data, error } = await supabase.rpc("execute_sql", {
      sql: `
        ALTER TABLE compradores 
        ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'transferencia',
        ADD COLUMN IF NOT EXISTS comprobante_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS estado_transferencia VARCHAR(20) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS fecha_transferencia TIMESTAMP DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS admin_revisor VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS notas_admin TEXT DEFAULT NULL;
      `,
    })

    if (error) {
      console.error("❌ Error ejecutando SQL:", error)

      // Intentar método alternativo usando update para forzar la estructura
      console.log("Intentando método alternativo...")

      const { error: updateError } = await supabase
        .from("compradores")
        .update({
          metodo_pago: "transferencia",
          comprobante_url: null,
          estado_transferencia: null,
        })
        .eq("id", "non-existent-id")

      if (updateError && updateError.code === "PGRST204") {
        console.log("Las columnas no existen, necesita migración manual.")
      }
    } else {
      console.log("✅ Migración completada exitosamente")
    }
  } catch (error) {
    console.error("❌ Error en migración:", error)
  }
}

migrate()
