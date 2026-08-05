'use client';

import { useProgress } from '@/lib/context/ProgressContext';
import ToggleSwitch from './ToggleSwitch';

export default function RememberFiltersToggle({
  initial,
}: {
  initial: boolean;
}) {
  const {
    settingsLoaded,
    rememberFilters: liveRememberFilters,
    setRememberFilters,
  } = useProgress();
  const rememberFilters = settingsLoaded ? liveRememberFilters : initial;

  return (
    <ToggleSwitch
      id="remember-filters-toggle"
      on={rememberFilters}
      onChange={setRememberFilters}
    />
  );
}
