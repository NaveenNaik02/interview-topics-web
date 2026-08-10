-- Add UPDATE RLS policy to progress table to allow upserts without 42501 (Insufficient Privilege) errors
create policy "Users can update their own progress"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
