alter table public.exercise_logs
  add column if not exists followed_plan boolean not null default false,
  add column if not exists rpe numeric(3,1) check (rpe between 1 and 10),
  add column if not exists notes text,
  add column if not exists set_data jsonb not null default '[]'::jsonb;
