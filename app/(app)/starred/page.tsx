import { getUser } from '@/lib/supabase/user';
import { StarredClient, fetchStarredQuestions } from '@/features/starred';

export default async function StarredPage() {
  const { supabase, user } = await getUser();
  const questions = user ? await fetchStarredQuestions(supabase) : [];

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Shortlist</div>
        <h1 className="subtopic-title">Starred</h1>
        <p className="build-lede">
          Your hand-picked questions for a quick pass right before the
          interview.
        </p>
      </div>
      {questions.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">Nothing starred yet</div>
          <div className="es-sub">
            Star a question from any topic — look for the star icon on each row
            — to build your pre-interview shortlist.
          </div>
        </div>
      ) : (
        <StarredClient questions={questions} />
      )}
    </div>
  );
}
