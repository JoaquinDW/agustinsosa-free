const { Pool } = require("pg")

const pool = new Pool({
  connectionString:
    "postgres://postgres.ambvsbgwukdhnxfvdgeh:6uUFIXuGrD0CgLp6@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
})

async function migrate() {
  try {
    console.log("Ejecutando migración...")

    const query = `
      ALTER TABLE compradores 
      ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'transferencia',
      ADD COLUMN IF NOT EXISTS comprobante_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS estado_transferencia VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS fecha_transferencia TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS admin_revisor VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS notas_admin TEXT DEFAULT NULL;
    `

    await pool.query(query)
    console.log("✅ Migración completada exitosamente")

    // Verificar que las columnas existen
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'compradores' 
      AND column_name IN ('metodo_pago', 'comprobante_url', 'estado_transferencia')
    `)

    console.log("Columnas agregadas:", result.rows)
  } catch (error) {
    console.error("❌ Error en migración:", error)
  } finally {
    await pool.end()
  }
}

migrate()
