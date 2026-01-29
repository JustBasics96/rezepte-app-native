import React, { useEffect, useState } from 'react'
import { Image, ImageStyle, StyleSheet } from 'react-native'

// Placeholder image for recipes without photo
const placeholderImage = require('../../../assets/images/placeholder-receipe.png')

export function RecipeImage({ uri, style }: { uri: string | null; style?: ImageStyle }) {
  const [hasError, setHasError] = useState(false)

  // Reset error state when URI changes
  useEffect(() => {
    setHasError(false)
  }, [uri])

  const showImage = !!uri && !hasError

  if (showImage && uri) {
    return (
      <Image
        source={{ uri }}
        style={style}
        resizeMode="cover"
        onError={(e) => {
          setHasError(true)
        }}
      />
    )
  }

  // Show placeholder image
  const placeholderStyle = StyleSheet.flatten([
    { width: 80, height: 60, borderRadius: 12 },
    style
  ]) as ImageStyle

  return (
    <Image
      source={placeholderImage}
      style={placeholderStyle}
      resizeMode="cover"
    />
  )
}
