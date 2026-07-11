# CLAUDE.md — mypr.pro.bd

## Project Summary

mypr.pro.bd is a developer portfolio tool that lets engineers showcase their merged pull requests on a public timeline. Users authenticate with GitHub OAuth, select which of their public repos to display, and the app fetches and caches their merged PRs from GitHub. Visitors can browse any user's PR timeline and follow developers to see their work in a home feed. Always add details git commit after finish any task.

## Stack

| Layer | Technology | Version |
|---|---|---| ---|
| Framework | Next.js (App Router) | 14 |
| Language | TypeScript | strict mode |
| Auth + DB | Supabase | latest |
| Styling | Tailwind CSS + shadcn/ui + Lucide React | latest |
| GitHub API | Octokit | latest |
| Screenshot | html2canvas | latest |
| Hosting | Vercel | — |

## Folder Structure

```
/app
  /api
    /auth           → Supabase auth callback route
    /sync-prs       → GitHub PR fetch and Supabase cache route
  /(app)
    /feed           → Home timeline (protected)
    /[username]     → Public profile + PR timeline
    /settings       → Repo configuration (protected)
  /changelog        → Public changelog page (see Changelog section below)
/components
  /ui               → shadcn/ui components
  /pr-card          → PR timeline card component
  /timeline         → Timeline feed component
/lib
  supabase.ts       → Typed Supabase client
  github.ts         → Octokit setup + GitHub helpers
  utils.ts          → Shared utilities
/types
  index.ts          → All shared TypeScript types
```

## Database Schema

### profiles
```sql
id                 uuid (PK, references auth.users)
github_username    text (unique, not null)
github_avatar_url  text
github_access_token text
display_name       text
created_at         timestamptz (default now())
```

### follows
```sql
follower_id        uuid (FK → profiles.id)
following_id       uuid (FK → profiles.id)
created_at         timestamptz (default now())
PRIMARY KEY (follower_id, following_id)
```

### repositories
```sql
id                 uuid (PK)
user_id            uuid (FK → profiles.id)
repo_full_name     text (e.g. "octocat/hello-world")
is_active          boolean (default false)
created_at         timestamptz (default now())
```

### pull_requests
```sql
id                 uuid (PK)
user_id            uuid (FK → profiles.id)
repo_full_name     text
pr_number          integer
title              text
body_summary       text (first 150 chars of PR body)
pr_url             text
merged_at          timestamptz
additions          integer
deletions          integer
commits_count      integer
synced_at          timestamptz (default now())
```

## Code Conventions

- **Server components by default.** Use `"use client"` only when interactivity or browser hooks are required.
- **Typed Supabase client.** All DB queries go through `lib/supabase.ts`. Never import the Supabase client directly in components.
- **No inline styles.** Tailwind only. No `style={{}}` props.
- **File naming.** Component files: `PascalCase.tsx`. Utility/lib files: `camelCase.ts`.
- **API route sessions.** Every API route must validate the Supabase session before executing any logic.
- **No `console.log` in production code.** Use error boundaries and proper error returns instead.
- **TypeScript strict.** All types defined in `/types/index.ts` or co-located. No `any`.
- **Environment variables.** Never hardcode secrets. Always use `process.env.*`.

## Changelog

- Public page at `/changelog` (`src/app/changelog/page.tsx`), linked from the footer's app nav (`src/components/layout/Footer.tsx` → `APP_LINKS`).
- Entries live in the `CHANGELOG` array at the top of `src/app/changelog/page.tsx`, grouped by date, newest first.
- When shipping a user-facing feature, fix, or UX change, add a bullet to the changelog in the same commit.
- **Never list dependency/package version bumps** (e.g. `chore(deps): update packages`) as changelog entries — those are not user-facing.
- Keep entries in plain, user-facing language (what changed for the user), not commit-message or internal implementation language.
- The footer's app nav intentionally does not include Feed or Settings — those stay in the header nav for authenticated users. Footer app links are currently: About, Changelog.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://mypr.pro.bd
```

## Key Decisions

| Decision | Reason |
|---|---|
| Supabase for auth + DB | GitHub OAuth built-in, Postgres with RLS, fast setup, free tier |
| shadcn/ui | Unstyled primitives with Tailwind, full ownership of component code |
| PR summary from GitHub body | No AI dependency, keeps costs zero, respects the author's own description |
| No AI integration | Keeps the app fast, cheap, and deterministic |
| html2canvas for screenshots | Client-side only, no server cost, works without a headless browser |
| App Router (Next.js 14) | Server components reduce JS bundle, better for SEO on public profile pages |

## Do Not Do

- Do not use `any` TypeScript type. Define proper types in `/types/index.ts`.
- Do not bypass RLS by using the service role key in client-side code. Service role key is server-only.
- Do not fetch from GitHub API directly in components. Use `lib/github.ts` helpers.
- Do not import Supabase directly in components. Use the typed client from `lib/supabase.ts`.
- Do not add `console.log` statements. Remove before committing.
- Do not hardcode environment variables or API keys anywhere in source code.
- Do not use inline styles (`style={{}}`). Use Tailwind classes only.
- Do not create client components unless strictly necessary. Prefer server components.
- Do not skip session validation in API routes. Every route must check auth first.
- Do not fetch all PRs on every page load. Use the cached `pull_requests` table; trigger sync explicitly.
- Do not make the `github_access_token` column readable by clients. It must never be exposed via the anon key.
- No AI footprint in Git Commit message such as "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
