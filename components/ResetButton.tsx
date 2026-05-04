'use client'

import { useProgress } from '@/lib/ProgressContext'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export default function ResetButton() {
  const { resetAll } = useProgress()

  const handleReset = () => {
    if (window.confirm('Reset all progress? This cannot be undone.')) {
      resetAll()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleReset}>
      <RotateCcw className="h-4 w-4 mr-2" />
      Reset All
    </Button>
  )
}
