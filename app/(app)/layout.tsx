import { Sidebar } from '@/features/sidebar';
import Topbar from '@/components/Topbar';
import MainContent from '@/components/MainContent';
import StoreProvider from '@/lib/stores/StoreProvider';
import { getUser } from '@/lib/supabase/user';
import { getAllGroups } from '@/lib/topicsData';
import { DrawerProvider } from '@/lib/context/DrawerContext';
import { SearchProvider } from '@/lib/context/SearchContext';
import { fetchAllCounts } from '@/lib/parser';
import OfflineToast from '@/components/OfflineToast';
import ThemeSync from '@/components/ThemeSync';
import AddQuestionFab from '@/components/AddQuestionFab';
import { InboxFab } from '@/features/inbox';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialTotals, groups, { user }] = await Promise.all([
    fetchAllCounts(),
    getAllGroups(),
    getUser(),
  ]);

  return (
    <StoreProvider groups={groups} totals={initialTotals}>
      <ThemeSync />
      <OfflineToast />
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
