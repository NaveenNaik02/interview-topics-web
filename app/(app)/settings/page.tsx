import { SettingsClient, DEFAULT_SETTINGS } from '@/features/settings';
import { fetchSettings } from '@/features/settings/db/dbServer';

export const metadata = { title: 'Settings — Prep Tracker' };

export default async function SettingsPage() {
  // Cache hit — the app layout already read this row on this request.
  const settings = (await fetchSettings()) ?? DEFAULT_SETTINGS;

  return <SettingsClient settings={settings} />;
}
