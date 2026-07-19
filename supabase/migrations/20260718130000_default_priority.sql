-- Settings > Study defaults: pre-selected priority when opening the Add
-- Question form. Null means "None" (leave it unset), matching the
-- `priority` table's own row-absence-as-unset convention.
alter table public.user_settings
  add column if not exists default_priority text
    check (default_priority in ('high', 'med', 'low'));

alter table public.user_settings
  alter column default_priority set default 'med';
