import { Sidebar } from '@/features/sidebar';
import Topbar from '@/components/Topbar';
import MainContent from '@/components/MainContent';
import StoreProvider from '@/lib/stores/StoreProvider';
import { getUser } from '@/lib/supabase/user';
import { getAllGroups } from '@/lib/content/topicsData';
import { DrawerProvider } from '@/lib/context/DrawerContext';
import { SearchProvider } from '@/lib/context/SearchContext';
import { fetchAllCounts } from '@/lib/content/parser';
import { fetchBadgeCounts } from '@/lib/db/badgeCounts';
import { fetchSettings } from '@/features/settings/db/dbServer';
import { fetchProgressIds } from '@/lib/db/progressServer';
import ThemeSync from '@/components/ThemeSync';
import AddQuestionFab from '@/components/AddQuestionFab';
import { InboxFab } from '@/features/inbox';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialTotals, groups, badges, settingsRow, progressIds, { user }] =
    await Promise.all([
      fetchAllCounts(),
      getAllGroups(),
      fetchBadgeCounts(),
      fetchSettings(),
      fetchProgressIds(),
      getUser(),
    ]);

  return (
    <StoreProvider
      groups={groups}
      totals={initialTotals}
      settingsRow={settingsRow}
      progressIds={progressIds}
      {...badges}
    >
      <ThemeSync />
      <AddQuestionFab />
      <InboxFab />
      <DrawerProvider>
        <SearchProvider>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Topbar user={user} />
              <MainContent>{children}</MainContent>
            </main>
          </div>
        </SearchProvider>
      </DrawerProvider>
    </StoreProvider>
  );
}
