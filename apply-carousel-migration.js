import { createClient } from "@supabase/supabase-js"
import fs from "fs"

// Configurar cliente Supabase usando variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyCarouselMigration() {
  try {
    console.log("🚀 Aplicando migración de carrusel...")

    // Leer el script SQL
    const migrationSQL = fs.readFileSync(
      "./scripts/10-add-carousel-images.sql",
      "utf8"
    )

    // Ejecutar la migración usando el cliente directo
    const { error } = await supabase.rpc("execute_raw_sql", {
      query: migrationSQL,
    })

    if (error) {
      console.error("❌ Error ejecutando migración:", error)

      // Intentar ejecución alternativa por partes
      console.log("📝 Intentando migración por partes...")

      const alterQueries = [
        `ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS carousel_image_1 TEXT DEFAULT NULL;`,
        `ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS carousel_image_2 TEXT DEFAULT NULL;`,
        `ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS carousel_image_3 TEXT DEFAULT NULL;`,
        `CREATE INDEX IF NOT EXISTS idx_sorteos_carousel_images ON sorteos(carousel_image_1, carousel_image_2, carousel_image_3);`,
      ]

      for (const query of alterQueries) {
        try {
          const { error: queryError } = await supabase.rpc("execute_raw_sql", {
            query,
          })
          if (queryError) {
            console.log(`⚠️  Query falló: ${query}`, queryError.message)
          } else {
            console.log(`✅ Query ejecutada: ${query}`)
          }
        } catch (err) {
          console.log(`⚠️  Error en query: ${query}`, err.message)
        }
      }
    } else {
      console.log("✅ Migración aplicada exitosamente")
    }
  } catch (error) {
    console.error("❌ Error general:", error)
  }
}

applyCarouselMigration()
