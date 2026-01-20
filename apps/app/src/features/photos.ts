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

  const contentType = opts.mimeType || 'image/jpeg'

  // React Native / Expo: pass a file-like object with uri, name, and type.
  const file = {
    uri: opts.uri,
    name: `${opts.recipeId}.${ext}`,
    type: contentType
  } as any

  const { data, error } = await supabase.storage
    .from('recipe-photos')
    .upload(path, file, { upsert: true, contentType })

  if (error) throw error
  return data.path ?? path
}
