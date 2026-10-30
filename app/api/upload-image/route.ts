import { type NextRequest, NextResponse } from "next/server"
import { uploadToSupabase } from "@/lib/supabase-storage"
import { requireAdminRequest } from "@/lib/admin-api"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const allowedTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }
    const extension = allowedTypes[file.type]
    if (!extension) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    // Generar nombre único para el archivo
    const filename = `sorteo-${Date.now()}-${crypto.randomUUID()}.${extension}`

    const url = await uploadToSupabase(file, "sorteo-images", filename)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
