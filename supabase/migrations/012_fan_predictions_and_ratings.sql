-- Fan predictions (score before kick-off) and player ratings (1-10 after full time).
--
-- Writes never come straight from the browser: the server actions in
-- src/app/actions/predictions.ts check the session, the kick-off time and the
-- line-up first, then write with the service role. So there are no insert or
-- update policies here, only "read your own rows". Community figures (averages,
-- the leaderboard) are computed server-side with the service role too.

create table if not exists public.match_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  fixture_id  integer not null,
  home_goals  smallint not null check (home_goals between 0 and 20),
  away_goals  smallint not null check (away_goals between 0 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, fixture_id)
);

create index if not exists idx_match_predictions_fixture on public.match_predictions (fixture_id);

create table if not exists public.player_ratings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  fixture_id   integer not null,
  -- Line-ups come from ESPN by name; there is no stable cross-provider player id.
  player_name  text not null check (char_length(player_name) between 1 and 80),
  rating       smallint not null check (rating between 1 and 10),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, fixture_id, player_name)
);

create index if not exists idx_player_ratings_fixture on public.player_ratings (fixture_id);

alter table public.match_predictions enable row level security;
alter table public.player_ratings enable row level security;

drop policy if exists "Read own predictions" on public.match_predictions;
create policy "Read own predictions" on public.match_predictions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Read own ratings" on public.player_ratings;
create policy "Read own ratings" on public.player_ratings
  for select to authenticated
  using ((select auth.uid()) = user_id);
