'use client';

import { useAppStore } from '@/lib/stores/appStore';
import ToggleSwitch from './ToggleSwitch';

const RememberFiltersToggle = () => {
  const rememberFilters = useAppStore((s) => s.rememberFilters);
  const setRememberFilters = useAppStore((s) => s.setRememberFilters);

  return (
    <ToggleSwitch
      id="remember-filters-toggle"
      on={rememberFilters}
      onChange={setRememberFilters}
    />
  );
};

export default RememberFiltersToggle;
