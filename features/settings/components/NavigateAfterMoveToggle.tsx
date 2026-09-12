'use client';

import { useAppStore } from '@/lib/stores/appStore';
import ToggleSwitch from './ToggleSwitch';

const NavigateAfterMoveToggle = () => {
  const navigateAfterMove = useAppStore((s) => s.navigateAfterMove);
  const setNavigateAfterMove = useAppStore((s) => s.setNavigateAfterMove);

  return (
    <ToggleSwitch
      id="navigate-after-move-toggle"
      on={navigateAfterMove}
      onChange={setNavigateAfterMove}
    />
  );
};

export default NavigateAfterMoveToggle;
