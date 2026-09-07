import { ShortlistPage } from '@/components/ShortlistPage';

interface Props {
  searchParams: Promise<{ topic?: string }>;
}

export default async function GreyZonePage({ searchParams }: Props) {
  const { topic } = await searchParams;

  return (
    <ShortlistPage
      flag="grey_zone"
      basePath="/grey-zone"
      title="Grey Zone"
      lede="Questions you're not confident on yet, pulled from wherever you found them."
      emptyTitle="Nothing in the Grey Zone yet"
      emptySub='Open the kebab menu on any question and choose "Add to Grey Zone" to keep it here for a quick revisit.'
      openSlug={topic}
    />
  );
}
