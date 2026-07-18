-- Settings > Study defaults: whether "Move to…" jumps you to the
-- destination subtopic afterward, or leaves you where you are with just a
-- confirmation toast. Off by default — staying put is less disruptive when
-- reorganizing several questions in a row from the same page.
alter table public.user_settings
  add column if not exists navigate_after_move boolean not null default false;
