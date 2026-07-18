-- Instruction presets (Settings > Answer generation) were client-only
-- (localStorage), so they weren't scoped to the logged-in user and didn't
-- sync across devices like the rest of user_settings. Bring them into the
-- same table/row as default_sort etc. The default preset's text carries the
-- formatting convention that used to be applied by hand, so existing rows
-- backfill to something sensible instead of a blank instruction.
alter table public.user_settings
  add column if not exists instruction_presets jsonb not null default jsonb_build_array(
    jsonb_build_object(
      'id', 'default',
      'name', 'Default',
      'text', $TEXT$- Lead with a bold key term or topic name and a one-line definition in the same sentence, then expand with bullet points written as complete narrative sentences (not fragments). This is the default format.
- Keep it natural and concise, not padded — use only as many bullets as the topic genuinely needs. If the opening sentence alone fully answers it, that's enough.
- Bold key technical terms inline within the sentence as they come up — never as a static label like "**Caching:** ...".
- Use an em dash (—) within a bullet to add contrast or elaboration where it reads naturally.
- Switch to a Markdown table only when the content is inherently comparative (e.g. "X vs Y"). Use code blocks only when a code example is genuinely needed.$TEXT$
    )
  ),
  add column if not exists active_instruction_preset_id text not null default 'default';
