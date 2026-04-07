# TASKS.md — mypr.pro.bd

Task tracker for the full build. Each task is scoped to one Claude session.
Update MEMORY.md at the end of each session to reflect progress.

---

## Phase 1: Project Scaffolding ✅ COMPLETE

- [x] **1.1 — Initialize Next.js project**
  Set up a new Next.js 14 project with TypeScript, App Router, and Tailwind CSS using `create-next-app`. Configure `tsconfig.json` for strict mode. Verify the dev server runs.
  _Files: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`_

- [x] **1.2 — Install and configure shadcn/ui**
  Run `npx shadcn-ui@latest init` to set up the component system. Install base components needed early: `Button`, `Card`, `Badge`, `Avatar`, `Separator`, `Skeleton`, `Dialog`, `Switch`, `Tooltip`.
  _Files: `components/ui/*`, `lib/utils.ts`, `tailwind.config.ts`_

- [x] **1.3 — Create folder structure and placeholder files**
  Create all app directories and empty placeholder files so the file tree matches the spec. Add `types/index.ts` with placeholder type stubs.
  _Files: `app/(app)/feed/page.tsx`, `app/(app)/[username]/page.tsx`, `app/(app)/settings/page.tsx`, `app/api/auth/route.ts`, `app/api/sync-prs/route.ts`, `lib/supabase.ts`, `lib/github.ts`, `lib/utils.ts`, `types/index.ts`_

- [x] **1.4 — Configure environment variables**
  Create `.env.local` with all required variable keys (empty values). Add `.env.local` to `.gitignore`. Document all required variables in `README.md`.
  _Files: `.env.local`, `.gitignore`, `README.md`_

---

## Phase 2: Supabase Setup ✅ COMPLETE

- [x] **2.1 — Create Supabase project and configure GitHub OAuth**
  Create a new Supabase project. In the Supabase dashboard, enable GitHub as an OAuth provider. Set the callback URL to `https://mypr.pro.bd/api/auth/callback`. Record the client ID and secret.
  _External: Supabase dashboard, GitHub OAuth app settings_

- [x] **2.2 — Create database tables**
  Write and run the SQL migrations for all four tables: `profiles`, `follows`, `repositories`, `pull_requests`. Include all columns and types exactly as in CLAUDE.md.
  _Files: `supabase/migrations/001_create_tables.sql`_

- [x] **2.3 — Configure Row Level Security (RLS)**
  Enable RLS on all four tables. Write policies: profiles are readable by anyone, writable only by owner. follows readable by anyone, insert/delete by owner. repositories readable by anyone, insert/update/delete by owner. pull_requests readable by anyone, insert/update/delete by owner. `github_access_token` must never be readable by the anon key.
  _Files: `supabase/migrations/002_rls_policies.sql`_

- [x] **2.4 — Set up typed Supabase client**
  Generate types from the Supabase schema using the Supabase CLI (`supabase gen types`). Set up server and client Supabase helpers in `lib/supabase.ts` using `@supabase/ssr`.
  _Files: `lib/supabase.ts`, `types/supabase.ts`_

---

## Phase 3: Auth Flow ✅ COMPLETE

- [x] **3.1 — Implement GitHub OAuth login**
  Create the sign-in page with a "Login with GitHub" button. Wire it to Supabase's OAuth flow. Handle the redirect back from GitHub.
  _Files: `app/(auth)/login/page.tsx`, `app/api/auth/callback/route.ts`_

- [x] **3.2 — Handle post-login profile upsert**
  On successful login callback, upsert the user's profile into the `profiles` table using data from the GitHub OAuth token (username, avatar, access token). Redirect to `/settings` after first login.
  _Files: `app/api/auth/callback/route.ts`, `lib/supabase.ts`_

- [x] **3.3 — Implement protected routes middleware**
  Add Next.js middleware to redirect unauthenticated users away from `/feed` and `/settings`. Public routes (`/[username]`, `/login`) remain accessible without a session.
  _Files: `middleware.ts`_

- [x] **3.4 — Session access in server components**
  Create a helper to read the current session in server components and API routes. Use this consistently in all protected pages.
  _Files: `lib/supabase.ts`, `app/(app)/feed/page.tsx`, `app/(app)/settings/page.tsx`_

---

## Phase 4: GitHub PR Sync ✅ COMPLETE

- [x] **4.1 — Set up Octokit client**
  Configure an authenticated Octokit instance using the user's stored `github_access_token`. Wrap it in a factory function in `lib/github.ts`.
  _Files: `lib/github.ts`_

- [x] **4.2 — Fetch merged PRs from GitHub**
  Write a function that queries the GitHub search API for merged PRs by a user across their active repos. Extract: title, body (truncate to 150 chars), URL, merged_at, additions, deletions, commits count.
  _Files: `lib/github.ts`_

- [x] **4.3 — Build the sync API route**
  Create `POST /api/sync-prs`. Validate session. Fetch the user's active repos from `repositories` table. Call the GitHub fetch function. Upsert results into `pull_requests` table. Return count of synced PRs.
  _Files: `app/api/sync-prs/route.ts`_

- [x] **4.4 — Add sync trigger to settings page**
  Add a "Sync PRs" button to the settings page that calls `POST /api/sync-prs` and shows synced count or error. Disable the button while syncing.
  _Files: `app/(app)/settings/page.tsx`_

---

## Phase 5: Repo Settings Page ✅ COMPLETE

- [x] **5.1 — List user's GitHub repos**
  On the settings page (server component), fetch the user's public GitHub repos via Octokit. Show repo name, visibility, and star count.
  _Files: `app/(app)/settings/page.tsx`, `lib/github.ts`_

- [x] **5.2 — Toggle repo active/inactive**
  Add a toggle switch next to each repo. On toggle, upsert a row in the `repositories` table with `is_active` set accordingly. Use a server action or client-side API call.
  _Files: `app/(app)/settings/page.tsx`, `app/api/repos/route.ts`_

- [x] **5.3 — Show active repo count and sync status**
  Display how many repos are currently active and when PRs were last synced (from `synced_at` on `pull_requests`). Add visual feedback for save state.
  _Files: `app/(app)/settings/page.tsx`_

---

## Phase 6: Profile Page ✅

- [x] **6.1 — Build the PR card component**
  Create `components/pr-card/PRCard.tsx`. Display: PR title, repo name, merged date, additions/deletions badge, commits count, link to GitHub PR. Use shadcn/ui Card and Badge.
  _Files: `components/pr-card/PRCard.tsx`, `types/index.ts`_

- [x] **6.2 — Build the timeline feed component**
  Create `components/timeline/Timeline.tsx` that accepts an array of PRs and renders them in reverse-chronological order with a vertical line connector.
  _Files: `components/timeline/Timeline.tsx`_

- [x] **6.3 — Build the public profile page**
  Create `app/(app)/[username]/page.tsx` as a server component. Fetch the user's profile and active PRs from Supabase. Render avatar, display name, GitHub link, and the Timeline component.
  _Files: `app/(app)/[username]/page.tsx`_

- [x] **6.4 — Handle 404 for unknown usernames**
  If the username does not exist in `profiles`, return a 404 page using Next.js `notFound()`.
  _Files: `app/(app)/[username]/page.tsx`_

---

## Phase 7: Home Feed

- [ ] **7.1 — Fetch followed users' PRs**
  Write a Supabase query that fetches merged PRs from all users the current user follows (via the `follows` table), ordered by `merged_at` desc, with a limit for pagination.
  _Files: `lib/supabase.ts`, `app/(app)/feed/page.tsx`_

- [ ] **7.2 — Build the feed page**
  Render the home feed as a server component using the Timeline component. Show a "no follows yet" empty state if the follow list is empty.
  _Files: `app/(app)/feed/page.tsx`_

- [ ] **7.3 — Add pagination to the feed**
  Implement cursor-based or offset pagination. Add a "Load more" button (client component) that appends more PRs to the list without a full page reload.
  _Files: `app/(app)/feed/page.tsx`, `components/timeline/Timeline.tsx`_

- [ ] **7.4 — Add loading skeletons**
  Add Skeleton components from shadcn/ui for the feed while data is loading.
  _Files: `app/(app)/feed/loading.tsx`_

---

## Phase 8: Follow System

- [ ] **8.1 — Build follow/unfollow API routes**
  Create `POST /api/follow` and `DELETE /api/follow`. Both validate session. Insert or delete a row in the `follows` table. Return updated follow state.
  _Files: `app/api/follow/route.ts`_

- [ ] **8.2 — Build the follow button component**
  Create `components/FollowButton.tsx` (client component). Shows "Follow" or "Unfollow" based on current state. Calls the API routes. Optimistic UI update.
  _Files: `components/FollowButton.tsx`_

- [ ] **8.3 — Add follow button to profile page**
  Render the FollowButton on the public profile page when the viewer is logged in and is not viewing their own profile.
  _Files: `app/(app)/[username]/page.tsx`_

- [ ] **8.4 — Sync GitHub follows on first login**
  After OAuth callback, fetch the authenticated user's GitHub following list and bulk-insert matching `profiles` into the `follows` table. Skip any GitHub usernames that don't have a profile yet.
  _Files: `app/api/auth/callback/route.ts`, `lib/github.ts`_

---

## Phase 9: Screenshot Download

- [ ] **9.1 — Install and configure html2canvas**
  Install `html2canvas`. Create a utility function in `lib/utils.ts` that takes a DOM ref and downloads it as a PNG with a consistent filename.
  _Files: `lib/utils.ts`, `package.json`_

- [ ] **9.2 — Add download button to PR card**
  Add a "Download" icon button to `PRCard.tsx` that captures only that card as a PNG using the html2canvas utility.
  _Files: `components/pr-card/PRCard.tsx`_

- [ ] **9.3 — Add download button to full timeline**
  Add a "Download timeline" button on the profile page that captures the entire timeline section as a PNG.
  _Files: `app/(app)/[username]/page.tsx`, `components/timeline/Timeline.tsx`_

---

## Phase 10: Polish and Deploy

- [ ] **10.1 — Add page metadata and OG images**
  Add `generateMetadata` to the profile page with title, description, and OG image (user avatar + name). Add default metadata to `app/layout.tsx`.
  _Files: `app/layout.tsx`, `app/(app)/[username]/page.tsx`_

- [ ] **10.2 — Add error boundaries and fallback UI**
  Wrap the feed and profile page in error boundaries. Add `error.tsx` and `not-found.tsx` files for each route segment.
  _Files: `app/(app)/feed/error.tsx`, `app/(app)/[username]/not-found.tsx`_

- [ ] **10.3 — Configure Vercel project**
  Create the Vercel project linked to the GitHub repo. Set all environment variables in the Vercel dashboard. Set the production domain to `mypr.pro.bd`. Verify the build passes.
  _External: Vercel dashboard_

- [ ] **10.4 — End-to-end smoke test**
  Log in with GitHub, add a repo, sync PRs, visit the public profile, follow a user, check the feed, download a PR card. Fix any blockers found.
  _All routes_
