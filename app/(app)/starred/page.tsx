import { ShortlistPage } from '@/components/ShortlistPage';

interface Props {
  searchParams: Promise<{ topic?: string }>;
}

export default async function StarredPage({ searchParams }: Props) {
  const { topic } = await searchParams;

  return (
    <ShortlistPage
      flag="starred"
      basePath="/starred"
      title="Starred"
      lede="Your hand-picked questions for a quick pass right before the interview."
      emptyTitle="Nothing starred yet"
      emptySub="Star a question from any topic — look for the star icon on each row — to build your pre-interview shortlist."
      openSlug={topic}
    />
  );
}
