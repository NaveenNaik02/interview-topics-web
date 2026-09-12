'use client';

import { useAppStore } from '@/lib/stores/appStore';
import ToggleSwitch from './ToggleSwitch';

const RememberFiltersToggle = ({ initial }: { initial: boolean }) => {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const liveRememberFilters = useAppStore((s) => s.rememberFilters);
  const setRememberFilters = useAppStore((s) => s.setRememberFilters);
  const rememberFilters = settingsLoaded ? liveRememberFilters : initial;

  return (
    <ToggleSwitch
      id="remember-filters-toggle"
      on={rememberFilters}
      onChange={setRememberFilters}
    />
  );
};

export default RememberFiltersToggle;
