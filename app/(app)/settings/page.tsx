import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS } from '@/lib/db/settings';
import SettingsClient from '@/components/SettingsClient';

export const metadata = { title: 'Settings — Prep Tracker' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
