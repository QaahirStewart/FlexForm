create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal text default 'Build strength',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_key text not null,
  workout_name text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  exercise_name text not null,
  completed_sets integer not null default 0 check (completed_sets >= 0),
  weight_kg numeric(6,2),
  reps integer,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;

create policy "Users can read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "Users can read own sessions" on public.workout_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own sessions" on public.workout_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own sessions" on public.workout_sessions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own sessions" on public.workout_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own exercise logs" on public.exercise_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own exercise logs" on public.exercise_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own exercise logs" on public.exercise_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own exercise logs" on public.exercise_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);
create index if not exists exercise_logs_session_idx
  on public.exercise_logs (session_id);
