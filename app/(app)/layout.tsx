import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import MainContent from '@/components/MainContent';
import StoreBootstrap from '@/components/StoreBootstrap';
import { getUser } from '@/lib/supabase/user';
import { TopicsProvider } from '@/lib/context/TopicsContext';
import { TotalsProvider } from '@/lib/context/TotalsContext';
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
    <TopicsProvider groups={groups}>
      <TotalsProvider initialTotals={initialTotals}>
        <StoreBootstrap initialTotals={initialTotals} />
        <ThemeSync />
        <OfflineToast />
        <AddQuestionFab />
        <InboxFab />
        <DrawerProvider>
          <SearchProvider>
            <div className="app-container">
              <Sidebar groups={groups} />
              <main className="main-content">
                <Topbar user={user} />
                <MainContent>{children}</MainContent>
              </main>
            </div>
          </SearchProvider>
        </DrawerProvider>
      </TotalsProvider>
    </TopicsProvider>
  );
}
