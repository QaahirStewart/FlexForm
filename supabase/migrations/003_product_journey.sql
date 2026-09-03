alter table public.profiles
  add column if not exists experience text default 'Returning',
  add column if not exists days_per_week integer default 4 check (days_per_week between 2 and 7),
  add column if not exists equipment_setup text default 'Full gym',
  add column if not exists plan_mode text default 'generated',
  add column if not exists onboarding_complete boolean not null default false;

alter table public.workout_sessions
  add column if not exists calories_burned integer not null default 0 check (calories_burned >= 0),
  add column if not exists completed_exercises integer not null default 0 check (completed_exercises >= 0);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'generated' check (source in ('generated', 'custom')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer not null check (day_index >= 0),
  day_name text not null,
  exercise_key text not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (routine_id, day_index, position)
);

create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null default current_date,
  active_calories integer not null default 0 check (active_calories >= 0),
  steps integer not null default 0 check (steps >= 0),
  bodyweight_kg numeric(5,2),
  calories_consumed integer check (calories_consumed >= 0),
  protein_grams integer check (protein_grams >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, metric_date)
);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.daily_metrics enable row level security;

create policy "Users manage own routines" on public.routines
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own routine exercises" on public.routine_exercises
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own daily metrics" on public.daily_metrics
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists routines_user_active_idx on public.routines (user_id, active, updated_at desc);
create index if not exists routine_exercises_routine_day_idx on public.routine_exercises (routine_id, day_index, position);
create index if not exists daily_metrics_user_date_idx on public.daily_metrics (user_id, metric_date desc);
