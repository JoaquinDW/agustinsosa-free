// Script para aplicar la migración de ganadores pasados a Supabase
const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Error: Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  )
  console.log("Asegúrate de tener un archivo .env.local con estas variables:")
  console.log("NEXT_PUBLIC_SUPABASE_URL=tu_url")
  console.log("SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function aplicarMigracion() {
  try {
    console.log("🚀 Iniciando migración de ganadores pasados...")

    // Leer el archivo SQL
    const sqlPath = path.join(
      __dirname,
      "scripts",
      "15-add-ganadores-pasados.sql"
    )
    const sql = fs.readFileSync(sqlPath, "utf8")

    console.log("📝 Aplicando migración SQL...")

    // Ejecutar el SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql })

    if (error) {
      // Si no existe la función exec_sql, intentamos dividir y ejecutar comando por comando
      console.log(
        "⚠️  No se pudo usar exec_sql, ejecutando comandos individualmente..."
      )

      // Dividir el SQL en comandos individuales
      const commands = sql
        .split(";")
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"))

      for (const command of commands) {
        console.log(`Ejecutando: ${command.substring(0, 50)}...`)
        const { error: cmdError } = await supabase.rpc("exec_sql", {
          sql_query: command,
        })

        if (cmdError) {
          console.error(`❌ Error en comando: ${cmdError.message}`)
          throw cmdError
        }
      }
    }

    console.log("✅ Migración aplicada exitosamente")

    // Verificar que la tabla se creó correctamente
    console.log("\n🔍 Verificando tabla ganadores_pasados...")
    const { data: ganadores, error: errorVerificar } = await supabase
      .from("ganadores_pasados")
      .select("*")
      .limit(1)

    if (errorVerificar) {
      console.error("❌ Error verificando tabla:", errorVerificar.message)
    } else {
      console.log("✅ Tabla ganadores_pasados creada correctamente")
      console.log("📊 Ganadores en la tabla:", ganadores?.length || 0)
    }

    console.log("\n✨ Proceso completado exitosamente!")
  } catch (error) {
    console.error("❌ Error aplicando migración:", error.message)
    process.exit(1)
  }
}

aplicarMigracion()
