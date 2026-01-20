import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { decode as decodeBase64 } from 'base64-arraybuffer'

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

  // On web, expo-image-picker returns a browser URI; Supabase expects a Blob/File.
  if (Platform.OS === 'web') {
    const response = await fetch(opts.uri)
    const blob = await response.blob()

    const { data, error } = await supabase.storage
      .from('recipe-photos')
      .upload(path, blob, { upsert: true, contentType })

    if (error) {
      throw error
    }
    return data.path ?? path
  }

  // On native (iOS/Android), follow Supabase's React Native guidance:
  // read the file as base64 and upload an ArrayBuffer.
  try {
    // Some Expo versions don't expose EncodingType; 'base64' works everywhere.
    const base64 = await FileSystem.readAsStringAsync(opts.uri, {
      encoding: 'base64' as FileSystem.EncodingType
    })

    const arrayBuffer = decodeBase64(base64)

    const { data, error } = await supabase.storage
      .from('recipe-photos')
      .upload(path, arrayBuffer, { upsert: true, contentType })

    if (error) {
      throw error
    }

    return data.path ?? path
  } catch (err) {
    throw err
  }
}
