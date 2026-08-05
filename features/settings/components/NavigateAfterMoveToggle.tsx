'use client';

import { useProgress } from '@/lib/context/ProgressContext';
import ToggleSwitch from './ToggleSwitch';

export default function NavigateAfterMoveToggle({
  initial,
}: {
  initial: boolean;
}) {
  const {
    settingsLoaded,
    navigateAfterMove: liveNavigateAfterMove,
    setNavigateAfterMove,
  } = useProgress();
  const navigateAfterMove = settingsLoaded ? liveNavigateAfterMove : initial;

  return (
    <ToggleSwitch
      id="navigate-after-move-toggle"
      on={navigateAfterMove}
      onChange={setNavigateAfterMove}
    />
  );
}
