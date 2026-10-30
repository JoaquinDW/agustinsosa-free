import { supabaseAdmin } from "@/lib/supabase-admin"

export async function uploadToSupabase(
  file: File | Buffer,
  bucket: string,
  path: string,
  contentType?: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    contentType: contentType || (file instanceof File ? file.type : "application/octet-stream"),
    upsert: true,
  })

  if (error) {
    console.error("Error uploading to Supabase:", error)
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Obtener URL pública
  if (bucket === "comprobantes") {
    return `private://${bucket}/${data.path}`
  }

  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path)

  return publicData.publicUrl
}

export async function deleteFromSupabase(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

  if (error) {
    console.error("Error deleting from Supabase:", error)
    throw new Error(`Delete failed: ${error.message}`)
  }
}

export function getSupabaseUrl(bucket: string, path: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

  return data.publicUrl
}
