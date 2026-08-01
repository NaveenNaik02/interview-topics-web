'use client'

import { useEffect } from 'react'
import { useProgress } from '@/lib/context/ProgressContext'
import { useTheme } from '@/lib/context/ThemeContext'

export default function ThemeSync() {
  const { settingsTheme } = useProgress()
  const { setTheme } = useTheme()

  // When DB settings load, apply the stored theme (overrides localStorage default)
  useEffect(() => {
    if (settingsTheme) setTheme(settingsTheme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsTheme])

  return null
}
