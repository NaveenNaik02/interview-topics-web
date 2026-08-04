import { createClient } from '@/lib/supabase/server';

// Resolves the caller's own cookie-scoped client + user in one call — the
// same two lines were duplicated across every server action and server
// component that needed either.
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireUser() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}

// Anonymous users can track progress/priority/starred/inbox, but not create
// shared content — `message` is what explains that at each call site.
export async function requireAuthor(message: string) {
  const { supabase, user } = await requireUser();
  if (user.is_anonymous) throw new Error(message);
  return { supabase, user };
}
