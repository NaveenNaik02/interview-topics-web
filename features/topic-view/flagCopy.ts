import type { ShortlistFlag } from '@/lib/db/shortlist';
import { Icon } from '@/components/SidebarIcons';

export const FLAG_COPY: Record<
  ShortlistFlag,
  { title: string; confirm: string; where: string; icon: () => React.ReactNode }
> = {
  starred: {
    title: 'Unstar all?',
    confirm: 'Unstar all',
    where: 'your Starred shortlist',
    icon: Icon.Star,
  },
  grey_zone: {
    title: 'Clear grey zone?',
    confirm: 'Clear grey zone',
    where: 'the Grey Zone',
    icon: Icon.GreyZone,
  },
};

export const FLAGS = ['starred', 'grey_zone'] as const;
