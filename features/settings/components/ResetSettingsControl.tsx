'use client';

import { useState } from 'react';
import { useProgress } from '@/lib/context/ProgressContext';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ResetSettingsControl() {
  const { resetSettingsToDefaults } = useProgress();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  return (
    <>
      <button className="reset-all" onClick={() => setResetConfirmOpen(true)}>
        Reset settings
      </button>
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset settings to default?"
        message="This restores every setting on this page (theme, sort order, remembered filters, default priority, move-navigation, AI instruction presets, etc.) to its original value. Any custom instruction versions you added will be removed. Your questions, topics, and progress are unaffected."
        confirmLabel="Reset settings"
        onConfirm={() => {
          resetSettingsToDefaults();
          setResetConfirmOpen(false);
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </>
  );
}
