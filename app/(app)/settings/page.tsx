import { getUser } from '@/lib/supabase/user';
import { SettingsClient, DEFAULT_SETTINGS } from '@/features/settings';

export const metadata = { title: 'Settings — Prep Tracker' };

export default async function SettingsPage() {
  const { supabase, user } = await getUser();

  let settings = DEFAULT_SETTINGS;

  if (user) {
    const { data } = await supabase
      .from('user_settings')
      .select(
        'default_sort, remember_filters, theme, instruction_presets, active_instruction_preset_id, navigate_after_move, default_priority',
      )
      .eq('user_id', user.id)
      .single();
    if (data) settings = data;
  }

  return <SettingsClient settings={settings} />;
}
