// Script para ejecutar la migración 12 en Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan credenciales de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('📦 Leyendo archivo de migración...')
    const migrationPath = path.join(__dirname, 'scripts', '12-add-instagram-optional-email.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🔄 Ejecutando migración en Supabase...')

    // Dividir el SQL en comandos individuales
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'))

    for (const command of commands) {
      console.log(`Ejecutando: ${command.substring(0, 60)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: command })

      if (error) {
        console.error('❌ Error ejecutando comando:', error)
        throw error
      }
    }

    console.log('✅ Migración completada exitosamente!')

    // Verificar que las columnas fueron creadas
    console.log('\n🔍 Verificando las columnas agregadas...')
    const { data, error } = await supabase
      .from('compradores')
      .select('instagram_username, email')
      .limit(1)

    if (error) {
      console.log('⚠️  No se pudo verificar (esto es normal si la tabla está vacía)')
    } else {
      console.log('✅ Las columnas están disponibles en la tabla')
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  }
}

runMigration()
