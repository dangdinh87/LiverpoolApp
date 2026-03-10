# Phase 04 -- Auth & User Profile

## Context
- [plan.md](./plan.md) | Phase 4 of 5 | Effort: 3h
- Depends on: Phase 01 (Supabase schema + client), Phase 02 (player data for favourites)

## Overview
Implement Supabase Auth (email/password + Google OAuth), protected routes via Next.js middleware, login/register pages, user profile page with avatar upload, and favourite players feature.

## Key Insights
- `@supabase/ssr` handles cookie-based auth for server/client components
- Middleware checks `/profile` only; Google OAuth via Supabase built-in provider
- Avatar upload to Supabase Storage `avatars` bucket; favourites toggle from `/player/[id]`

## Requirements
- Supabase project with Auth enabled (email + Google provider)
- Google OAuth credentials (Client ID + Secret) configured in Supabase Auth settings
- Storage bucket `avatars` created (public access)
- Phase 01 DB migration applied (user_profiles + favourite_players tables)

## Architecture
- `middleware.ts` at project root: intercept `/profile` routes, check Supabase session, redirect to `/auth/login` if unauthenticated
- Auth state managed via `@supabase/ssr` cookie helpers -- no client-side token storage
- Server actions for profile update + avatar upload (Next.js server actions)
- Favourite toggle: server action that inserts/deletes from `favourite_players`

## Related Code Files
- `src/middleware.ts`, `src/app/auth/callback/route.ts` -- auth infra
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` -- auth pages
- `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx` -- auth forms
- `src/app/profile/page.tsx` -- protected profile page
- `src/components/profile/profile-form.tsx`, `avatar-upload.tsx`, `favourite-list.tsx`
- `src/app/actions/auth.ts`, `src/app/actions/profile.ts` -- server actions

## Implementation Steps

### 1. Setup middleware (`src/middleware.ts`) (20min)
- Import `createServerClient` from `@supabase/ssr`
- In `middleware()`: create Supabase client from request cookies, call `supabase.auth.getUser()`
- If no user and path starts with `/profile`, redirect to `/auth/login?redirectTo=/profile`
- `config.matcher`: `['/profile/:path*']`
- Also refresh session cookie on every request (prevents stale sessions)

### 2. Build OAuth callback route (`src/app/auth/callback/route.ts`) (15min)
- GET handler: extract `code` from URL search params
- Exchange code for session: `supabase.auth.exchangeCodeForSession(code)`
- On success: check if `user_profiles` row exists for user; if not, insert default row
- Redirect to `searchParams.get('redirectTo') || '/'`

### 3. Build login page + form (30min)
- **LoginForm** (client): email/password fields (shadcn Input), submit calls `loginWithEmail` server action
- Google OAuth button: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
- Inline error display, link to register, glass card centered styling

### 4. Build register page + form (25min)
- **RegisterForm**: email + password + confirm password. Validation: match, min 6 chars
- Server action `registerWithEmail` calls `signUp()`, auto-creates `user_profiles` row
- Success: show "Check email for verification". Link to login

### 5. Build server actions (`src/app/actions/auth.ts`) (20min)
- `loginWithEmail(formData)`: extract email/password, call `signInWithPassword`, `revalidatePath('/')`, redirect
- `registerWithEmail(formData)`: call `signUp`, insert `user_profiles` row
- `logout()`: call `signOut`, `revalidatePath('/')`, redirect to `/`
- All actions use `createServerClient` from cookies

### 6. Build profile page (40min)
- Server component: fetch user from `supabase.auth.getUser()`, fetch `user_profiles` row
- Layout: avatar on left (with upload overlay), form on right (username, bio), favourite players below
- **ProfileForm** (client component): edit username + bio, submit calls server action `updateProfile(formData)`
- **AvatarUpload** (client component): click avatar to open file input, upload to `supabase.storage.from('avatars').upload()`, update `avatar_url` in profile

### 7. Build favourite players feature (30min)
- **Server action** `toggleFavouritePlayer(playerId, playerName, playerPhoto)`:
  - Check if row exists in `favourite_players` for current user + playerId
  - If exists: delete (unfavourite). If not: insert (favourite)
  - `revalidatePath('/profile')` + `revalidatePath('/player/[id]')`
- **On `/player/[id]` page**: add heart icon button (filled if favourited, outline if not). Check favourite status server-side
- **On `/profile` page**: `FavouriteList` displays all favourited players as mini cards with photo + name, link to `/player/[id]`, remove button

### 8. Update Navbar auth state (15min)
- Navbar reads auth state server-side via `supabase.auth.getUser()`
- If logged in: show avatar thumbnail + dropdown (Profile, Logout)
- If not: show "Login" button linking to `/auth/login`
- Use shadcn `DropdownMenu` for avatar dropdown

## Todo List
- [ ] Create middleware.ts with /profile protection
- [ ] Build OAuth callback route handler
- [ ] Build LoginForm + login page
- [ ] Build RegisterForm + register page
- [ ] Create auth server actions (login, register, logout)
- [ ] Build ProfileForm + AvatarUpload components
- [ ] Build /profile page with server-side data fetch
- [ ] Build toggleFavouritePlayer server action
- [ ] Add favourite heart button to /player/[id] page
- [ ] Build FavouriteList on profile page
- [ ] Update Navbar with auth-aware avatar/login button

## Success Criteria
- Email/password registration + login works end-to-end
- Google OAuth redirects correctly and creates profile
- `/profile` redirects to login when unauthenticated
- Avatar upload works, image displays after refresh
- Favourite player toggle works from player detail page
- Profile page shows favourites list with remove capability

## Risk Assessment
- **OAuth redirect mismatch**: Add both localhost + production URLs in Supabase Auth settings
- **Cookie handling**: Follow official Supabase Next.js guide for `@supabase/ssr` middleware cookies
- **Storage upload size**: Limit avatar to 2MB client-side before upload

## Security Considerations
- Passwords handled by Supabase Auth (never stored by app). RLS enforces user-scoped access
- Server actions validate auth before DB mutations. File upload restricted to image MIME types
- CSRF protection built into Next.js server actions

## Next Steps
Proceed to [Phase 05](./phase-05-history-polish.md) -- History, Polish & Deploy
