-- Performance: stop RLS re-evaluating auth.*() once per row, and index two
-- foreign keys that queries filter on.
--
-- `auth.uid()` and `auth.jwt()` are STABLE, not IMMUTABLE, so a policy that
-- calls them bare is re-evaluated for every candidate row. Wrapping the call in
-- a scalar subquery — `(select auth.uid())` — makes the planner hoist it into a
-- one-shot InitPlan instead. The predicates are otherwise identical, so this
-- changes performance only, never who can see what. Supabase's linter flagged
-- all 25 policies below (`auth_rls_initplan`).
--
-- Roles and command are restated exactly as they were. Where an UPDATE or ALL
-- policy had only USING and no WITH CHECK, that is preserved: Postgres reuses
-- USING as the check in that case.

-- ─── conversations ──────────────────────────────────────────────────────────

drop policy if exists "Users can view their own conversations" on public.conversations;
create policy "Users can view their own conversations" on public.conversations
  for select to public using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own conversations" on public.conversations;
create policy "Users can insert their own conversations" on public.conversations
  for insert to public with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own conversations" on public.conversations;
create policy "Users can update their own conversations" on public.conversations
  for update to public using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own conversations" on public.conversations;
create policy "Users can delete their own conversations" on public.conversations
  for delete to public using ((select auth.uid()) = user_id);

-- ─── messages ───────────────────────────────────────────────────────────────

drop policy if exists "Users can view messages of their conversations" on public.messages;
create policy "Users can view messages of their conversations" on public.messages
  for select to public using (
    (select auth.uid()) in (
      select c.user_id from public.conversations c where c.id = messages.conversation_id
    )
  );

drop policy if exists "Users can insert messages to their conversations" on public.messages;
create policy "Users can insert messages to their conversations" on public.messages
  for insert to public with check (
    (select auth.uid()) in (
      select c.user_id from public.conversations c where c.id = messages.conversation_id
    )
  );

drop policy if exists "Users can update messages of their conversations" on public.messages;
create policy "Users can update messages of their conversations" on public.messages
  for update to public using (
    (select auth.uid()) in (
      select c.user_id from public.conversations c where c.id = messages.conversation_id
    )
  );

-- ─── article_likes ──────────────────────────────────────────────────────────

drop policy if exists "Users manage own likes" on public.article_likes;
create policy "Users manage own likes" on public.article_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own likes" on public.article_likes;
create policy "Users delete own likes" on public.article_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── article_comments ───────────────────────────────────────────────────────

drop policy if exists "Users insert own comments" on public.article_comments;
create policy "Users insert own comments" on public.article_comments
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own comments" on public.article_comments;
create policy "Users update own comments" on public.article_comments
  for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users delete own comments" on public.article_comments;
create policy "Users delete own comments" on public.article_comments
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── user_profiles ──────────────────────────────────────────────────────────

drop policy if exists "Users insert own profile" on public.user_profiles;
create policy "Users insert own profile" on public.user_profiles
  for insert to public with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own profile" on public.user_profiles;
create policy "Users update own profile" on public.user_profiles
  for update to public using ((select auth.uid()) = user_id);

drop policy if exists "Users delete own profile" on public.user_profiles;
create policy "Users delete own profile" on public.user_profiles
  for delete to public using ((select auth.uid()) = user_id);

-- ─── favourite_players ──────────────────────────────────────────────────────

drop policy if exists "Users manage own favourites" on public.favourite_players;
create policy "Users manage own favourites" on public.favourite_players
  for all to public using ((select auth.uid()) = user_id);

-- ─── saved_articles ─────────────────────────────────────────────────────────

drop policy if exists "Users can view own saved articles" on public.saved_articles;
create policy "Users can view own saved articles" on public.saved_articles
  for select to public using ((select auth.uid()) = user_id);

drop policy if exists "Users can save articles" on public.saved_articles;
create policy "Users can save articles" on public.saved_articles
  for insert to public with check ((select auth.uid()) = user_id);

drop policy if exists "Users can unsave own articles" on public.saved_articles;
create policy "Users can unsave own articles" on public.saved_articles
  for delete to public using ((select auth.uid()) = user_id);

-- ─── gallery_images (admin by email claim) ──────────────────────────────────

drop policy if exists "Admin can insert gallery images" on public.gallery_images;
create policy "Admin can insert gallery images" on public.gallery_images
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'email') = 'nguyendangdinh47@gmail.com');

drop policy if exists "Admin can update gallery images" on public.gallery_images;
create policy "Admin can update gallery images" on public.gallery_images
  for update to authenticated
  using (((select auth.jwt()) ->> 'email') = 'nguyendangdinh47@gmail.com');

drop policy if exists "Admin can delete gallery images" on public.gallery_images;
create policy "Admin can delete gallery images" on public.gallery_images
  for delete to authenticated
  using (((select auth.jwt()) ->> 'email') = 'nguyendangdinh47@gmail.com');

-- ─── site_settings (admin by email claim) ───────────────────────────────────

drop policy if exists "Admin can insert site settings" on public.site_settings;
create policy "Admin can insert site settings" on public.site_settings
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'email') = 'nguyendangdinh47@gmail.com');

drop policy if exists "Admin can update site settings" on public.site_settings;
create policy "Admin can update site settings" on public.site_settings
  for update to authenticated
  using (((select auth.jwt()) ->> 'email') = 'nguyendangdinh47@gmail.com');

drop policy if exists "Admin can delete site settings" on public.site_settings;
create policy "Admin can delete site settings" on public.site_settings
  for delete to authenticated
  using (((select auth.jwt()) ->> 'email') = 'nguyendangdinh47@gmail.com');

-- ─── Covering indexes for the two unindexed foreign keys ────────────────────
-- `messages.conversation_id` is the hot one: opening a conversation reads its
-- messages by that column, and the RLS subquery above joins on it too.

create index if not exists idx_messages_conversation_id
  on public.messages (conversation_id);

create index if not exists idx_conversations_user_id
  on public.conversations (user_id);
