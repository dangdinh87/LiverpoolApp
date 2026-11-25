-- Allow guest (anonymous cookie-backed) match score predictions and add
-- a lightweight community forum / shared live chat table.
--
-- Writes are always validated server-side and made via getServiceClient()
-- so anonymous visitors cannot forge other actors' predictions or posts.

-- 1. Guest-friendly match predictions
alter table public.match_predictions
  drop constraint if exists match_predictions_user_id_fkey;

alter table public.match_predictions
  add column if not exists author_name text
  check (author_name is null or char_length(author_name) between 1 and 40);

-- 2. Community forum / shared chat
create table if not exists public.forum_posts (
  id            uuid primary key default gen_random_uuid(),
  room          text not null default 'matchday' check (room in ('matchday', 'transfers', 'tactics', 'general')),
  author_id     uuid not null,
  is_member     boolean not null default false,
  author_name   text not null check (char_length(author_name) between 1 and 40),
  author_avatar text,
  content       text not null check (char_length(content) between 1 and 600),
  parent_id     uuid references public.forum_posts (id) on delete cascade,
  reply_to_name text check (reply_to_name is null or char_length(reply_to_name) <= 40),
  created_at    timestamptz not null default now()
);

create index if not exists idx_forum_posts_created on public.forum_posts (created_at desc);
create index if not exists idx_forum_posts_room_created on public.forum_posts (room, created_at desc);
create index if not exists idx_forum_posts_parent on public.forum_posts (parent_id);

alter table public.forum_posts enable row level security;

drop policy if exists "Public read forum posts" on public.forum_posts;
create policy "Public read forum posts"
  on public.forum_posts
  for select
  to anon, authenticated
  using (true);
