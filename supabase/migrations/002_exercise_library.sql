create table if not exists public.favorite_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_key)
);

create table if not exists public.guide_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  completed_at timestamptz not null default now()
);

alter table public.favorite_exercises enable row level security;
alter table public.guide_completions enable row level security;

create policy "Users can read own favorites" on public.favorite_exercises
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own favorites" on public.favorite_exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete own favorites" on public.favorite_exercises
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own guide completions" on public.guide_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own guide completions" on public.guide_completions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create index if not exists favorite_exercises_user_idx
  on public.favorite_exercises (user_id, created_at desc);
create index if not exists guide_completions_user_idx
  on public.guide_completions (user_id, completed_at desc);
