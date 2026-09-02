import { useEffect, useRef } from 'react'

// Reveals generated text a few characters at a time so it reads as being
// written, not dumped in. Shared by AddQuestionModal's answer generator and
// AddTopicModal's blurb generator.
export function useTypewriter(onChange: (text: string) => void) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  const run = (full: string, onDone?: () => void) => {
    stop()
    let i = 0
    const step = Math.max(2, Math.round(full.length / 90))
    timerRef.current = setInterval(() => {
      i += step
      if (i >= full.length) {
        onChange(full)
        stop()
        onDone?.()
      } else {
        onChange(full.slice(0, i))
      }
    }, 12)
  }
  useEffect(() => stop, [])
  return run
}
