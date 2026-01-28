import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useTheme } from './theme'

type OnboardingStep = {
  emoji: string
  titleKey: string
  bodyKey: string
}

const STEP_KEYS: OnboardingStep[] = [
  { emoji: '👋', titleKey: 'onboarding.step1Title', bodyKey: 'onboarding.step1Body' },
  { emoji: '📝', titleKey: 'onboarding.step2Title', bodyKey: 'onboarding.step2Body' },
  { emoji: '📅', titleKey: 'onboarding.step3Title', bodyKey: 'onboarding.step3Body' },
  { emoji: '🛒', titleKey: 'onboarding.step4Title', bodyKey: 'onboarding.step4Body' },
  { emoji: '👨‍👩‍👧‍👦', titleKey: 'onboarding.step5Title', bodyKey: 'onboarding.step5Body' }
]

type Props = {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [step, setStep] = useState(0)

  const current = STEP_KEYS[step]
  const isLast = step === STEP_KEYS.length - 1

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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEP_KEYS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === step ? theme.tint : theme.border }]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{t(current.titleKey)}</Text>
        <Text style={[styles.body, { color: theme.muted }]}>{t(current.bodyKey)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isLast && (
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.muted }]}>{t('common.skip')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={next}
          style={[styles.nextBtn, { backgroundColor: theme.tint }]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('onboarding.letsGo') : t('common.next')}
        >
          <Text style={styles.nextText}>{isLast ? t('onboarding.letsGo') : t('common.next')}</Text>
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
