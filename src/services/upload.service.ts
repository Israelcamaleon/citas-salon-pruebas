import { createSupabaseAdmin, getStorageBucket } from "@/lib/supabase/server"

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

function extFromMime(type: string) {
  switch (type) {
    case "image/png": return ".png"
    case "image/jpeg": return ".jpg"
    case "image/webp": return ".webp"
    case "image/gif": return ".gif"
    default: return ""
  }
}

export async function saveUpload(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.")
  }

  const ab = await file.arrayBuffer()
  if (ab.byteLength > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 2 MB.")
  }

  const ext = extFromMime(file.type) || (file.name.includes(".") ? `.${file.name.split(".").pop()}` : "")
  const path = `logo_${Date.now()}${ext}`
  const bucket = getStorageBucket()
  const supabase = createSupabaseAdmin()

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, Buffer.from(ab), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    throw new Error(error.message || "No se pudo subir el archivo")
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl }
}
