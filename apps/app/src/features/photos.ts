import { supabase } from '../platform/supabase'

export function publicPhotoUrl(path: string | null) {
  if (!path) return null
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  return data.publicUrl
}

function extFromMime(mime: string | undefined) {
  if (!mime) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  return 'jpg'
}

export async function uploadRecipePhoto(opts: {
  householdId: string
  recipeId: string
  uri: string
  mimeType?: string
}) {
  const ext = extFromMime(opts.mimeType)
  const path = `${opts.householdId}/${opts.recipeId}.${ext}`

  // Expo-compatible upload: fetch the local uri and upload Blob.
  const resp = await fetch(opts.uri)
  const blob = await resp.blob()

  const { data, error } = await supabase.storage
    .from('recipe-photos')
    .upload(path, blob, { upsert: true, contentType: opts.mimeType })

  if (error) throw error
  return data.path
}
