'use client';

import { RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/stores/appStore';
import { Button } from '@/components/ui/button';

export default function ResetButton() {
  const resetAll = useAppStore((s) => s.resetAll);

  const handleReset = () => {
    if (window.confirm('Reset all progress? This cannot be undone.')) {
      resetAll();
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleReset}>
      <RotateCcw className="h-4 w-4 mr-2" />
      Reset All
    </Button>
  );
}
