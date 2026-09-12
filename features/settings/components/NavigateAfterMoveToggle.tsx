'use client';

import { useAppStore } from '@/lib/stores/appStore';
import ToggleSwitch from './ToggleSwitch';

const NavigateAfterMoveToggle = ({ initial }: { initial: boolean }) => {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const liveNavigateAfterMove = useAppStore((s) => s.navigateAfterMove);
  const setNavigateAfterMove = useAppStore((s) => s.setNavigateAfterMove);
  const navigateAfterMove = settingsLoaded ? liveNavigateAfterMove : initial;

  return (
    <ToggleSwitch
      id="navigate-after-move-toggle"
      on={navigateAfterMove}
      onChange={setNavigateAfterMove}
    />
  );
};

export default NavigateAfterMoveToggle;
