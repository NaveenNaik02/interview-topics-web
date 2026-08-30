import type { User } from '@supabase/supabase-js';
import type { ParsedQuestion } from '@/lib/parser';

// Edit/move/delete are the author's own — plus admins, who have the matching
// `_admin` RLS policies on questions.
export const canManage = (q: ParsedQuestion, user: User | null) => {
  return (
    !!user &&
    (q.createdBy === user.id || user.app_metadata?.is_admin === true)
  );
};
