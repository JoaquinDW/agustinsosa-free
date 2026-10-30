import { randomUUID } from "crypto"
import * as dotenv from "dotenv"
import path from "path"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL, la clave anónima y la service role en .env.local",
  )
}

const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function expectPermissionDenied(
  label: string,
  error: { code?: string; message?: string } | null,
) {
  if (!error || error.code !== "42501") {
    throw new Error(
      `${label}: se esperaba permission denied (42501), se recibió ${error?.code || "sin error"} ${error?.message || ""}`,
    )
  }
  console.log(`✓ ${label}`)
}

async function main() {
  const publicRead = await anon.from("sorteos").select("id").limit(1)
  if (publicRead.error) {
    throw new Error(`La lectura pública de sorteos falló: ${publicRead.error.message}`)
  }
  console.log("✓ La lectura pública de sorteos continúa disponible")

  const buyerRead = await anon.from("compradores").select("id").limit(1)
  expectPermissionDenied("La lectura anónima de compradores está bloqueada", buyerRead.error)

  const tableMutation = await anon
    .from("sorteos")
    .update({ nombre: "RLS security probe" })
    .eq("id", "00000000-0000-0000-0000-000000000000")
  expectPermissionDenied("La escritura anónima en tablas está bloqueada", tableMutation.error)

  const rpcMutation = await anon.rpc("corregir_duplicados_comprador", {
    p_comprador_id: "00000000-0000-0000-0000-000000000000",
    p_sorteo_id: "00000000-0000-0000-0000-000000000000",
  })
  expectPermissionDenied("La RPC mutante está revocada", rpcMutation.error)

  const storagePath = `security-probe/${randomUUID()}.txt`
  const upload = await anon.storage
    .from("sorteo-images")
    .upload(storagePath, new Blob(["probe"], { type: "text/plain" }))

  if (!upload.error) {
    await service.storage.from("sorteo-images").remove([storagePath])
    throw new Error("Storage permitió un upload anónimo; el archivo de prueba fue eliminado")
  }
  console.log("✓ Los uploads anónimos a Storage están bloqueados")

  console.log("\nVerificación RLS completada correctamente.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
