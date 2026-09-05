alter table public.routines
  add column if not exists start_date date,
  add column if not exists weekdays text[] not null default '{}',
  add column if not exists duration_weeks integer check (duration_weeks is null or duration_weeks > 0);
