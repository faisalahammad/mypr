# MEMORY.md — mypr.pro.bd

Session state tracker. Update this at the end of every Claude session.
Paste this file (along with CLAUDE.md) at the start of each new session to restore context.

---

## Current Status

**Phase:** Feed overhaul complete, back to Phase 10 — Polish and Deploy 🚧
**Last completed:** About page content refresh with live contributions feed and community updates (2026-04-10)
**Next:** Verify Faisal's social profile URLs before deployment and continue Phase 10 polish

---

## Session Summary (2026-04-10)

### Completed This Session
- ✅ Updated About page metadata and Person JSON-LD to reflect the Customer Support Engineer positioning and new community links
- ✅ Rewrote the About hero copy, social links, work history, WordPress Core contribution summary, and community/speaking section
- ✅ Added a new public `src/app/api/about/contributions/route.ts` route backed by the Supabase service role client with fallback static data and daily cache headers
- ✅ Added `src/components/about/LiveContributions.tsx` to fetch and render merged PR contribution totals dynamically from `mypr.pro.bd`
- ✅ Removed the About page "Get in Touch" section while keeping Published Plugins, Current Projects, and the footer About link unchanged

### Verification
- `npm test -- tests/unit/about-page.test.tsx tests/component/about-components.test.tsx`
- `npm run build`

---

## Session Summary (2026-04-09)

### Completed This Session
- ✅ Added a new public `/about` page at `src/app/about/page.tsx` using the public profile shell pattern
- ✅ Added exact About page metadata, canonical URL, Open Graph fields, and Person JSON-LD schema
- ✅ Added static server components for `ProfileHero`, `WorkHistory`, `ContributionGrid`, and `WordCampSection`
- ✅ Added the supplied portrait to `public/faisal-ahammad.jpg` with `alt="Faisal Ahammad"`
- ✅ Added inline static sections for Published Plugins, Current Projects, and Get in Touch
- ✅ Updated the shared footer so `About` appears in both landing and non-landing footer navigation
- ✅ Added targeted About page and footer tests

### Manual Steps Already Required
- Verify these social URLs before deploying the About page:
  - `https://github.com/faisalahammad`
  - `https://linkedin.com/in/faisalahammad`
  - `https://profiles.wordpress.org/faisalahammad`
  - `https://twitter.com/faisalahammad`

### Verification
- `npm test -- tests/unit/about-page.test.tsx tests/component/about-components.test.tsx tests/component/footer.test.tsx`
- `npm run build`

---

## Session Summary (2026-04-09)

### Completed This Session
- ✅ Added the new scored feed engine in `src/lib/feed.ts` with relationship weighting, recency decay, engagement boost, cursor pagination, diversity penalties, and feed-cache helpers
- ✅ Replaced the old feed page wiring with the new `/api/feed` flow and server-rendered cache-aware initial load
- ✅ Added `/api/feed/invalidate` and `/api/reactions` routes
- ✅ Added feed UI components for infinite scroll, reaction buttons, optimistic PR reactions, and loading skeletons
- ✅ Added `reactions`, `feed_cache`, `github_follows`, and `pull_requests.reaction_counts` typing support in `src/lib/supabase.ts`
- ✅ Updated auth callback to sync GitHub follows into `github_follows` and invalidate the current user feed cache
- ✅ Updated follow and PR sync routes to invalidate feed cache according to the new rules

### Manual Steps Already Required
- SQL already run manually in Supabase for:
  - `reactions`
  - `feed_cache`
  - `github_follows`
  - `pull_requests.reaction_counts`
  - reaction count trigger

### Verification
- `npm test -- tests/unit/feed.test.ts`
- Targeted TypeScript check passed for the touched feed, route, and cache invalidation files

---

## Session Summary (2026-04-08)

### Completed This Session
- ✅ Replaced the old Phase 5 placeholder in settings with the real repository management UI backed by `/api/repos`
- ✅ Added optimistic repository toggles, active repo counts, repo loading/error states, and sync gating when no repos are active
- ✅ Extracted shared GitHub OAuth start logic into a reusable login button and used it on the home page, floating nav, and `/login`
- ✅ Reconciled phase tracking docs so `TASKS.md` now matches the implemented Phases 7–9

### Verification
- Settings page tests updated for repo rendering, optimistic toggle, rollback, and sync gating
- Shared GitHub login button tests added for OAuth start contract and safe `next` preservation

---

## Session Summary (2026-04-07)

### Completed This Session
- ✅ Phase 6: Profile Page (PR card, timeline, public profile, 404)
- ✅ Phase 7: Home Feed (feed page, pagination, loading skeletons, API route)
- ✅ Phase 8: Follow System (follow/unfollow API, FollowButton, profile integration, GitHub sync)

### Test Count Progression
- After Phase 6: 97 tests
- After Phase 7: 124 tests (+27)
- After Phase 8: 142 tests (+18)
- After Phase 9: 161 tests (+19) — 155 passing, 6 pre-existing settings failures

### Git Commits
- `b27d48b` — feat: implement Phase 6 - Profile Page
- `fe32552` — feat: implement Phase 7 - Home Feed with pagination and loading states
- `94828bc` — feat: implement Phase 8 - Follow System
- `6a0db1e` — docs: update MEMORY.md with Phase 8 completion
- `0b30fce` — feat: implement Phase 9 - Screenshot Download

---

## Key Learnings (permanent, carry forward)

- **shadcn/ui Button has no `asChild` prop** in this version — use `<a>` tags with button Tailwind classes
- **Supabase queries typed as `never`** — apply `as any` or explicit interface cast on `.map()` and `.insert()` results
- **`Github` icon missing from lucide-react** — use inline SVG instead
- **Next.js `cookies()` fails in Jest** — never directly unit-test functions that call `createSupabaseServerClient()`; use schema validation tests instead
- **Next.js Web APIs (Request, Response) not available in Jest** — avoid importing API route modules in tests; use schema/contract tests
- **`PullRequestWithProfile`** extends `PullRequest` directly — PR fields are at top level, not nested under `pr:`
- **Optimistic UI pattern**: update state immediately, revert on error — used in FollowButton and repo toggles
- **GitHub follow sync on every login is safe** — upsert with `onConflict` makes it idempotent

---

## Testing Strategy (established pattern)

- **Component tests**: render + user interaction via `@testing-library/react` + `user-event`
- **API contract tests**: validate request/response shapes with plain objects — no route imports
- **Unit tests**: pure functions only (no Next.js APIs, no Supabase client calls)
- **What NOT to test in Jest**: functions calling `cookies()`, `headers()`, or `NextResponse`
- **API routes**: tested via schema validation tests only (unit testing impossible due to Web API deps)

---

## Blockers Log

### Phase 8 — All Resolved ✅

1. **Supabase `follows` insert typed as `never`** ✅
   - Error: `Argument of type '{ follower_id: string; following_id: string; }' is not assignable to parameter of type 'never'`
   - Resolution: Added `as any` to the insert value in `src/app/api/follow/route.ts`

### Phase 7 — All Resolved ✅

1. **`@testing-library/user-event` not installed** ✅ — `npm install --save-dev @testing-library/user-event`
2. **Skeleton component not installed** ✅ — `npx shadcn@latest add skeleton`
3. **`cookies()` called outside request scope in Jest** ✅ — replaced unit tests with schema validation tests
4. **`Request`/`Response` not defined in Jest for API routes** ✅ — added global mocks to `jest.setup.js`; but `NextResponse.json()` still fails (ResponseCookies expects real Headers). Final resolution: dropped API route unit tests entirely
5. **`following_id` doesn't exist on type `never`** ✅ — `follows.map((f: any) => f.following_id)`
6. **`getByRole('generic')` matches multiple elements** ✅ — use `const { container } = render(...)` instead

### Phase 6 — All Resolved ✅

1. **Button `asChild` prop not available** ✅ — use `<a>` with Tailwind button classes
2. **Supabase profile query typed as `never`** ✅ — applied explicit typed interface cast
3. **`PullRequestWithProfile` type structure misunderstood in tests** ✅ — PR fields at top level, not nested
4. **`Github` icon missing from lucide-react** ✅ — inline SVG
5. **Avatar component not installed** ✅ — `npx shadcn@latest add avatar`

---

## Completed Phases

### Phase 1: Project Scaffolding ✅
- Next.js 14 (now running 16.2.2), TypeScript strict, App Router, Tailwind CSS v4, `/src` layout
- shadcn/ui: Button, Card, Badge, Avatar, Separator, Skeleton, Dialog, Switch installed
- Folder structure, type stubs, environment variables configured

### Phase 2: Supabase Setup ✅
- Project: `xlayjufjlhfgkblymdsu`
- Tables: `profiles`, `follows`, `repositories`, `pull_requests`
- RLS enabled and verified; `github_access_token` never readable by anon key
- Typed Supabase client via `@supabase/ssr` in `src/lib/supabase.ts`

### Phase 3: Auth Flow ✅
- GitHub OAuth login page at `/login`
- Auth callback at `/api/auth/callback` — upserts profile, stores token, redirects to `/settings`
- Middleware protecting `/feed` and `/settings`
- Server helpers: `getSession()`, `getUser()`, `getUserProfile()`, `requireAuth()`, `isAuthenticated()`

### Phase 4: GitHub PR Sync ✅
- `createOctokit()`, `getMergedPRs()`, `getAllMergedPRs()`, `getPRSummary()`, `validateToken()` in `lib/github.ts`
- `POST /api/sync-prs` — validates session, fetches active repos, upserts PRs
- `GET /api/sync-prs` — returns last sync time
- Settings page "Sync PRs" button with loading/success/error states

### Phase 5: Repository Settings ✅
- `GET /api/repos` — fetches GitHub repos merged with DB active status
- `POST /api/repos` — toggles `is_active` in `repositories` table
- Settings page: repo list with Switch toggle, active count badge, sync status, loading/error states, and sync gating when no repos are active

### Phase 6: Profile Page ✅
- `src/components/pr-card/PRCard.tsx` — stats, relative date formatting, GitHub link
- `src/components/timeline/Timeline.tsx` — vertical line, dot markers, empty state
- `src/app/(app)/[username]/page.tsx` — server component, SEO metadata, notFound() on miss
- `src/app/(app)/[username]/not-found.tsx` — branded 404 page

### Phase 7: Home Feed ✅
- `src/lib/supabase.ts` — added `getFollowedPRs(userId, limit, offset)` and `isFollowing(currentId, targetId)`
- `src/app/(app)/feed/page.tsx` — server component, fetches first 20 PRs, passes to FeedClient
- `src/app/(app)/feed/loading.tsx` — 5 skeleton PR cards matching feed layout
- `src/app/api/feed-prs/route.ts` — paginated endpoint (limit max 50, offset), returns `prs/hasMore/total`
- `src/components/feed/FeedClient.tsx` — client component, "Load more" button, error retry, optimistic offset

### Phase 8: Follow System ✅
- `src/app/api/follow/route.ts`
  - `POST /api/follow` — inserts `follows` row; returns `{ following: true }`; handles duplicate gracefully (23505)
  - `DELETE /api/follow` — deletes by `follower_id + following_id`; returns `{ following: false }`
  - Both validate session; reject self-follow with 400
- `src/components/FollowButton.tsx` — client component; optimistic toggle; reverts on fetch error
- `src/app/(app)/[username]/page.tsx` — added `getUser()` + `isFollowing()` calls; renders `<FollowButton>` only when viewer is authenticated and not on own profile
- `src/lib/github.ts` — added `getGitHubFollowing(token)`: paginated fetch of GitHub following list
- `src/app/api/auth/callback/route.ts` — after profile upsert, fetches GitHub following, cross-references profiles table, bulk-upserts into `follows` (non-fatal on error)

---

## Files Index (Phase 8)

### New Files
- `src/app/api/follow/route.ts`
- `src/components/FollowButton.tsx`
- `tests/api/follow-schema.test.ts` (10 tests)
- `tests/component/follow-button.test.tsx` (8 tests)

### Modified Files
- `src/lib/github.ts` — added `getGitHubFollowing()`
- `src/app/api/auth/callback/route.ts` — added GitHub follow sync block
- `src/app/(app)/[username]/page.tsx` — added FollowButton, getUser, isFollowing

---

## Test Results (current)

| Phase | Tests | Cumulative |
|-------|-------|------------|
| 1–4   | 18    | 18         |
| 5     | +12   | 36         |
| 6     | +31   | 97         |
| 7     | +27   | 124        |
| 8     | +18   | **142**    |

**Build:** ✅ TypeScript clean, 12 routes

---

## Notes

- `TASKS.md` and `MEMORY.md` had drifted: Phases 7–9 were implemented in code but still unchecked in `TASKS.md`
- Phase 5 was only partially complete before this session: the APIs existed, but the settings page still rendered placeholder copy instead of the repo selector
- RLS policies confirmed working; `github_access_token` never exposed to anon key
- All protected routes (feed, settings) validated by middleware
- Follow sync runs on every login — safe due to upsert with `onConflict`
- Ready for Phase 9: Screenshot Download

---

### Phase 9: Screenshot Download ✅
- `src/lib/utils.ts` — added `downloadAsImage(element, filename)` using html2canvas with dynamic import (client-only)
- `src/components/pr-card/PRCard.tsx` — added Download icon button in footer with `useRef` on card container, loading state while capturing
- `src/components/timeline/DownloadableTimeline.tsx` — new client wrapper around Timeline with "Download Timeline" button; button hidden when no PRs
- `src/app/(app)/[username]/page.tsx` — replaced `Timeline` with `DownloadableTimeline`
- Tests: `tests/unit/download-utils.test.ts` (6), `tests/component/downloadable-timeline.test.tsx` (11), 2 additions to `pr-card.test.tsx`

**Last updated:** 2026-04-08 (settings UI aligned with Phase 5, direct GitHub login enabled from home/nav, docs reconciled)
