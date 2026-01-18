import React, { useEffect, useState } from 'react'
import { Image, ImageStyle, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'

// Render a simple placeholder view instead of requiring a binary asset

export function RecipeImage({ uri, style }: { uri: string | null; style?: ImageStyle }) {
  const [hasError, setHasError] = useState(false)

  // Reset error state when the uri changes
  useEffect(() => {
    setHasError(false)
  }, [uri])

  const showImage = !!uri && !hasError

  if (showImage) {
    return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setHasError(true)} />
  }

  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }] as ImageStyle}>
      <FontAwesome name="image" size={24} color="#999" />
    </View>
  )
}
