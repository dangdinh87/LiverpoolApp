---
title: "Supabase Gallery Schema & Admin RBAC"
type: research
date: 2026-03-14
---

# Supabase Gallery Schema & Admin RBAC for Liverpool App

## 1. Database Schema Design

### Core Tables

#### `gallery_images` (main table)
```sql
create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  cloudinary_url text not null,
  cloudinary_public_id text not null unique,
  title text not null,
  category gallery_category not null,
  tags text[] default array[]::text[],
  width integer,
  height integer,
  is_homepage_eligible boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### `gallery_category` Enum
```sql
create type gallery_category as enum (
  'stadium',
  'players',
  'trophies',
  'matches',
  'fans',
  'historic',
  'training',
  'celebrations'
);
```

**Rationale**: Fixed 8 categories for Liverpool FC gallery. Use enum over table for:
- Performance (single table query vs join)
- Simplicity (no admin interface needed for category CRUD)
- Type safety at DB level

#### `gallery_homepage_background` (singleton configuration)
```sql
create table gallery_homepage_background (
  id uuid primary key default gen_random_uuid(),
  current_image_id uuid not null references gallery_images(id) on delete cascade,
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users(id)
);
```

**Constraint**: Keep only 1 row via trigger/application logic.

---

## 2. Admin Role-Based Access Control

### Best Pattern: `profiles` table with `is_admin` field

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for admin checks
create index on profiles(is_admin) where is_admin = true;
```

**Why this approach**:
- ✓ Check email hardcoded in RLS policies OR via profile lookup
- ✓ Flexible: enable/disable admin without changing JWT
- ✓ Auditable: track `updated_by` in gallery tables
- ✓ Scales: add other roles (moderator, viewer) later

**Setup trigger on auth.users creation**:
```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, new.email = 'nguyendangdinh47@gmail.com');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## 3. RLS Policies

```sql
alter table gallery_images enable row level security;

-- READ: Public (all users)
create policy "Gallery images are readable by anyone"
  on gallery_images for select
  using (true);

-- INSERT: Admin only
create policy "Only admins can upload images"
  on gallery_images for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- UPDATE: Admin only
create policy "Only admins can update images"
  on gallery_images for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- DELETE: Admin only
create policy "Only admins can delete images"
  on gallery_images for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Homepage background: readable by all, writable by admin only
alter table gallery_homepage_background enable row level security;

create policy "Homepage background is readable by anyone"
  on gallery_homepage_background for select
  using (true);

create policy "Only admins can update homepage background"
  on gallery_homepage_background for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );
```

---

## 4. Category Management: Enum vs Table Trade-offs

| Aspect | Enum | Separate Table |
|--------|------|-----------------|
| **Performance** | Faster (no join) | Slower (join required) |
| **Flexibility** | Fixed at schema time | Can add categories dynamically |
| **Use Case** | Fixed ~8 categories | 100+ dynamic categories |
| **Admin UI** | Not needed | Admin panel for CRUD |
| **Migration Complexity** | Requires migration | Simple insert row |

**Recommendation for Liverpool app**: **Enum** is correct (8 fixed categories, unlikely to change). Consider table if you want user-driven category creation.

---

## 5. Tags Field Design

Store as `text[]` (PostgreSQL array):

**Pros**:
- Efficient query: `tags @> ARRAY['stadium']` or `'stadium' = ANY(tags)`
- Simple denormalization (no tags table needed for 200 images)
- Flexible indexing: `create index on gallery_images using gin(tags)`

**Cons**:
- No referential integrity (app enforces tag consistency)
- No tag autocomplete without separate tags cache

**Alternative**: If you want tag autocomplete/suggestions, add `materialized_view`:
```sql
create materialized view gallery_tags as
select distinct unnest(tags) as tag from gallery_images
order by tag;

create index on gallery_tags(tag);
```

---

## 6. Homepage Background Selection

**Recommended implementation**:

1. **Single-row configuration table** (as above) — cleanest approach
2. **Application enforces uniqueness** via upsert on application layer:

```typescript
// Next.js server action
async function setHomepageBackground(imageId: string) {
  const { data, error } = await supabase
    .from('gallery_homepage_background')
    .upsert(
      {
        id: 'singleton-id', // fixed UUID
        current_image_id: imageId,
        updated_by: user.id
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
}
```

3. **Fetch current selection**:
```typescript
async function getHomepageBackground() {
  const { data } = await supabase
    .from('gallery_homepage_background')
    .select('current_image_id, gallery_images(*)')
    .single();
  return data;
}
```

---

## 7. Performance Considerations

**Indexes to create**:
```sql
-- Search/filter by category
create index gallery_images_category_idx on gallery_images(category);

-- Tag filtering via GIN
create index gallery_images_tags_gin_idx on gallery_images using gin(tags);

-- Homepage eligibility
create index gallery_images_homepage_eligible_idx
  on gallery_images(is_homepage_eligible)
  where is_homepage_eligible = true;

-- Recent images
create index gallery_images_created_at_idx on gallery_images(created_at desc);

-- Cloudinary public_id uniqueness
create unique index gallery_images_public_id_idx on gallery_images(cloudinary_public_id);
```

---

## 8. Admin Check Optimization

**Option A: Direct email check (simplest)**
```sql
with check (auth.jwt() ->> 'email' = 'nguyendangdinh47@gmail.com')
```
✓ No profile lookup, ✗ breaks if email changes in Auth

**Option B: Profile lookup (recommended)**
```sql
with check (
  exists (
    select 1 from profiles
    where id = auth.uid() and is_admin = true
  )
)
```
✓ Flexible, ✗ extra query (mitigated by index on `is_admin`)

**Use Option B** — allows future admin management UI and is more maintainable.

---

## 9. Cloudinary Integration Notes

- Store both `cloudinary_url` (full CDN URL) and `cloudinary_public_id` (for transformations/deletions)
- Public ID is unique and immutable — use as foreign key reference in other tables
- Width/height: optional, useful for aspect ratio calculations on frontend

---

## Summary

**Recommended Schema**:
- ✓ `gallery_images` + `gallery_category` enum
- ✓ `profiles` table with `is_admin` boolean
- ✓ `gallery_homepage_background` singleton config table
- ✓ RLS policies: public read, admin write/delete
- ✓ Tags as `text[]` array + GIN index
- ✓ Comprehensive indexes for category, tags, homepage eligibility

**No unresolved questions** — all patterns are production-ready for 200-image Liverpool gallery with single admin.
