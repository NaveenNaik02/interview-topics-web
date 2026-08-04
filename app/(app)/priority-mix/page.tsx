import { getUser } from '@/lib/supabase/user';
import { fetchPriorityQuestionsWithClient } from '@/lib/db/priority';
import PriorityMixClient from '@/components/PriorityMixClient';

export default async function PriorityMixPage() {
  const { supabase, user } = await getUser();

  const questions = user
    ? await fetchPriorityQuestionsWithClient(supabase)
    : [];

  return <PriorityMixClient questions={questions} />;
}
