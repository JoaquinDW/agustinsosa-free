/**
 * Sube los descargables por pack al bucket privado `contenido-packs` de Supabase
 * Storage. Ejecución ÚNICA y LOCAL (no corre en build):
 *
 *   pnpm tsx scripts/upload-contenido-packs.ts
 *
 * Requiere:
 *  - Los archivos fuente en ./contenido-fuente/ (ver .gitignore).
 *  - SUPABASE_SECRET_KEY (o la clave legacy SUPABASE_SERVICE_ROLE_KEY) en
 *    .env.local.
 *  - El comando `zip` disponible (macOS/Linux) para empaquetar los calcos.
 *
 * Crea el bucket si no existe (privado) y sube/sobrescribe los 3 archivos con
 * los mismos storagePath que usa lib/contenido-packs.ts.
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"
import { execSync } from "child_process"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  console.error(
    "❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local",
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET = "contenido-packs"
const FUENTE = path.join(process.cwd(), "contenido-fuente")
const CALCOS_DIR = "Sosa_Motos_Pack_Calcos_Digitales_Descargable"

// storagePath -> archivo local de origen (relativo a contenido-fuente/)
const ARCHIVOS: { storagePath: string; local: string; contentType: string }[] = [
  {
    storagePath: "ebook-instagram.pdf",
    local: "Ebook-Los secretos de instagram.pdf",
    contentType: "application/pdf",
  },
  {
    storagePath: "guia-premium.pdf",
    local: "Guia_Premium_Sosa_Motos_Todo_En_Uno.pdf",
    contentType: "application/pdf",
  },
  {
    storagePath: "calcos-digitales.zip",
    local: "calcos-digitales.zip", // generado abajo
    contentType: "application/zip",
  },
]

async function asegurarBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error

  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`✅ Bucket "${BUCKET}" ya existe`)
    return
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: false,
  })
  if (createError) throw createError
  console.log(`✅ Bucket privado "${BUCKET}" creado`)
}

function generarZipCalcos() {
  const zipPath = path.join(FUENTE, "calcos-digitales.zip")
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath)

  const calcosDir = path.join(FUENTE, CALCOS_DIR)
  if (!fs.existsSync(calcosDir)) {
    throw new Error(`No se encontró la carpeta de calcos: ${calcosDir}`)
  }

  // Zipea el CONTENIDO de la carpeta (sin incluir la carpeta padre).
  execSync(`zip -r -j "${zipPath}" "${calcosDir}"`, { stdio: "inherit" })
  console.log(`✅ ZIP de calcos generado: ${zipPath}`)
}

async function subirArchivos() {
  for (const archivo of ARCHIVOS) {
    const localPath = path.join(FUENTE, archivo.local)
    if (!fs.existsSync(localPath)) {
      throw new Error(`No se encontró el archivo: ${localPath}`)
    }

    const buffer = fs.readFileSync(localPath)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(archivo.storagePath, buffer, {
        contentType: archivo.contentType,
        upsert: true,
      })

    if (error) throw error
    console.log(
      `⬆️  Subido ${archivo.storagePath} (${(buffer.length / 1_000_000).toFixed(1)} MB)`,
    )
  }
}

async function main() {
  console.log("🚀 Subiendo descargables por pack a Supabase Storage...\n")
  await asegurarBucket()
  generarZipCalcos()
  await subirArchivos()
  console.log("\n🎉 Listo. Los 3 descargables están en el bucket privado.")
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
