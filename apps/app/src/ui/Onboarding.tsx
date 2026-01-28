import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from './theme'

type OnboardingStep = {
  emoji: string
  title: string
  body: string
}

const STEPS: OnboardingStep[] = [
  {
    emoji: '👋',
    title: 'Willkommen!',
    body: 'Unser Rezeptbuch hilft eurer Familie, den Wochenplan zu organisieren – damit niemand mehr fragt: "Was gibt es heute?"'
  },
  {
    emoji: '📝',
    title: 'Gerichte sammeln',
    body: 'Lege eure Lieblingsgerichte an – mit Zutaten, Foto und Tags wie "Schnell" oder "Kinder".'
  },
  {
    emoji: '📅',
    title: 'Woche planen',
    body: 'Ziehe Gerichte in den Wochenplan. Mit "Überrasch mich" bekommst du zufällige Vorschläge.'
  },
  {
    emoji: '🛒',
    title: 'Einkaufen',
    body: 'Die Einkaufsliste erstellt sich automatisch aus dem Plan – oder füge manuell Sachen hinzu.'
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Familie verbinden',
    body: 'Teile den Family-Code und plant gemeinsam. Alle sehen den gleichen Plan!'
  }
]

type Props = {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const t = useTheme()
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function next() {
    if (isLast) {
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  function skip() {
    onComplete()
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === step ? t.tint : t.border }]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={[styles.title, { color: t.text }]}>{current.title}</Text>
        <Text style={[styles.body, { color: t.muted }]}>{current.body}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isLast && (
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: t.muted }]}>Überspringen</Text>
          </Pressable>
        )}
        <Pressable
          onPress={next}
          style={[styles.nextBtn, { backgroundColor: t.tint }]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Los gehts' : 'Weiter'}
        >
          <Text style={styles.nextText}>{isLast ? 'Los gehts! 🚀' : 'Weiter'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 60
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 16
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16
  },
  body: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26
  },
  actions: {
    gap: 12
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600'
  },
  nextBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800'
  }
})
