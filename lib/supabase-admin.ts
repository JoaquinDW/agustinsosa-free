import { createClient } from "@supabase/supabase-js"

/**
 * Cliente de Supabase con SERVICE ROLE KEY. SOLO debe usarse en código de
 * servidor (rutas API / scripts). Nunca importar desde componentes cliente.
 *
 * Se usa para operar sobre el bucket privado `contenido-packs`: generar signed
 * URLs de descarga y subir los archivos, sin depender de políticas RLS.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY environment variable")
}

// Mismo schema que lib/supabase.ts ("gratis" por defecto en este sitio).
const supabaseDbSchema = process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "gratis"

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  db: { schema: supabaseDbSchema as "public" },
  auth: { persistSession: false, autoRefreshToken: false },
})
