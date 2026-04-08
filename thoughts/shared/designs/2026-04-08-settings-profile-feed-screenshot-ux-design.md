---
date: 2026-04-08
topic: "Refine Settings, Profile, Feed, and Screenshot UX"
status: draft
---

# Refine Settings, Profile, Feed, and Screenshot UX

## Problem Statement

The current Settings page conflates the "last successful sync range" with the live dropdown selection, making the summary card misleading. The Settings layout puts Sync and Repository visibility side-by-side on desktop, wasting horizontal space. The Profile page has a minimal contributor card with no meaningful metrics. PR cards show a text "View on GitHub" link in the footer instead of a compact icon. There's no repo-owner avatar system, so repo tiles, timeline items, and feed cards lack visual identity. Screenshots capture raw DOM instead of a polished preview surface.

## Constraints

- **No new npm dependencies** beyond what's already installed (html2canvas is the screenshot engine).
- **Database changes require a new migration** (003) — additive columns only, no renames or drops.
- **RLS policies** must be extended for any new columns exposed publicly.
- **Backward compatibility**: existing synced data must render correctly even if new columns are null.
- **Profile page is server-rendered** (`force-dynamic`) — animation must degrade gracefully without JS.
- **Feed pagination** must preserve current `followed`/`suggested` mixing logic.

## Approach

### Chosen: Incremental enhancement of existing components

Rather than a rewrite, we'll extend the existing data model, API responses, and component tree. Each change is independently deployable.

**Why this approach:**
- The codebase is well-structured with clear separation (types → lib → API → components).
- The `Database` type in `supabase.ts` already has a pattern for extending tables (see migration 002).
- All rendering paths already flow through `PRCard`, `Timeline`, and `FeedClient` — changes propagate everywhere.

**Alternatives considered:**
- *Full component library rebuild*: Overkill for the scope. The existing shadcn/ui components are solid.
- *Separate preview component for screenshots*: Adds complexity. Instead, we'll style the existing card/timeline containers as screenshot-ready surfaces.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ repositories │  │profiles      │  │ sync_metadata │  │
│  │ + owner_     │  │ (existing)   │  │ (new table)   │  │
│  │   avatar_url │  │              │  │ last_range    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
├─────────┴─────────────────┴───────────────────┴──────────┤
│                    API Layer                              │
│  /api/sync-prs  /api/repos  /api/feed-prs  /api/follow  │
│  + persists range  + returns    (no change)  (no change) │
│  + stores avatar   avatar_url                             │
├──────────────────────────────────────────────────────────┤
│                  Component Layer                          │
│  Settings ─── Profile ─── Feed ─── PRCard ─── Timeline   │
│  + last-range   + metrics   + avatar  + icon-link  +fade │
│  + 2-col grid   + preview   in cards  (no footer)  -in   │
│  + preview      + animation                                │
└──────────────────────────────────────────────────────────┘
```

## Components

### 1. Sync Metadata Persistence

**New table: `sync_metadata`**

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | UUID (PK, FK → profiles) | One row per user |
| `last_date_range` | TEXT | The `DateRange` value used in the last successful sync |
| `updated_at` | TIMESTAMPTZ | When the metadata was last written |

**Why a separate table instead of a column on `profiles`:**
- Keeps sync concerns isolated from profile data.
- Avoids cluttering the profiles table with operational metadata.
- Easy to extend with more sync state later (e.g., `last_sync_error`, `sync_in_progress`).

**Changes to sync-prs POST route:**
- After successful sync, upsert into `sync_metadata` with the `dateRange` that was used.
- The `dateRange` is already available in the request body — just persist it.

**Changes to sync-prs GET route:**
- Join or query `sync_metadata` to return `last_date_range` alongside `last_synced` and `total_prs`.
- Response shape becomes: `{ last_synced, total_prs, last_date_range }`.

**Settings page consumption:**
- `SyncResponse` interface gains `last_date_range: string | null`.
- The "Selected range" stat card reads from `syncInfo.last_date_range` (mapped to label), not from `dateRange` state.
- The dropdown state (`dateRange`) remains the *next sync input* — changing it doesn't affect the summary until sync succeeds.

### 2. Repo Owner Avatar URL

**Schema change:** Add `owner_avatar_url TEXT` column to `repositories` table (migration 003).

**Sync-time population:**
- In `searchMergedPRs` (github.ts), when fetching repo metadata via `GET /repos/{owner}/{repo}`, capture `repoData.owner.avatar_url`.
- Return it in the `RepoWithPRs` interface: add `owner_avatar_url: string | null`.
- In sync-prs route, include `owner_avatar_url` in the repository upsert data.

**API exposure:**
- `/api/repos` GET: add `owner_avatar_url` to the selected columns and response shape.
- `/api/feed-prs`: no direct change — feed queries pull from `pull_requests` joined with `profiles`. Repo avatar is fetched from `repositories` table client-side or embedded in a separate query.

**Rendering paths that consume avatar:**
- **Settings repo tiles**: replace the text `{owner}` badge with an `<Avatar>` using `owner_avatar_url`, fallback to text initial.
- **Profile timeline PR metadata**: show small repo avatar next to repo name badge in `PRCard`.
- **Feed PR cards**: same `PRCard` component, same avatar treatment.

**Fallback strategy:** When `owner_avatar_url` is null (repos synced before this migration), render the existing text-based owner badge. No breaking change.

### 3. Settings Page Layout Restructure

**Current layout (Row 1):**
```
┌─────────────────────────────┬──────────────────┐
│  Summary cards (4-col grid) │  Sync overview   │
│  Cached PRs | Active repos  │  (dark card)     │
│  Selected range | Last sync │  + Range hint    │
└─────────────────────────────┴──────────────────┘
```

**New layout:**
```
┌─────────────────────────────────────────────────┐
│  Row 1: Summary cards (4-col grid, full width)  │
│  Cached PRs | Active repos | Last synced range  │
│  | Last synced time                             │
├─────────────────────────────────────────────────┤
│  Row 2: Sync your data (full width)             │
│  [dropdown] [Sync PRs button]                   │
│  [status message]                               │
│  [What happens during sync]                     │
├─────────────────────────────────────────────────┤
│  Row 3: Repository visibility (full width)      │
│  ┌─────────────┐  ┌─────────────┐               │
│  │ Repo tile 1 │  │ Repo tile 2 │  (2-col grid  │
│  │ [avatar]    │  │ [avatar]    │   on desktop)  │
│  │ owner/name  │  │ owner/name  │               │
│  │ toggle      │  │ toggle      │               │
│  │ screenshot  │  │ screenshot  │               │
│  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────┘
```

**Specific changes:**
- Remove the dark "Sync overview" card entirely (it contained "Range hint" which is being removed).
- Move "Sync your data" to its own full-width row.
- Make "Repository visibility" full-width with a 2-column grid on desktop (`lg:grid-cols-2`).
- Remove `tracking-[0.2em]` from stat labels ("Cached PRs", "Active repos", etc.) — use plain `text-xs font-medium text-muted-foreground` instead.
- Remove the "Range hint" row from the overview card (card is deleted anyway).

### 4. Per-Repo Screenshot Preview Flow

**Current:** `handleRepoScreenshot` calls `downloadAsImage(repoCard, ...)` on the raw repo tile DOM element. This captures the toggle, metadata, and everything — not a clean preview.

**New flow:**
1. User clicks "Screenshot" on a repo tile.
2. A **preview card** is rendered (either inline below the tile or in a modal/overlay) styled as a polished portfolio surface:
   - Clean white card with subtle shadow
   - Repo name prominently displayed
   - Owner avatar (if available)
   - PR count badge
   - "mypr.pro.bd" branding watermark
3. The preview card is the screenshot target (passed to `downloadAsImage`).
4. Loading state: button shows spinner while html2canvas renders.
5. Error state: inline toast if capture fails.

**Implementation approach:**
- Add a `PreviewCard` component that accepts `repo` data and renders a styled surface.
- Use a hidden/offscreen `<div>` ref that gets rendered when screenshot is triggered, then captured.
- After capture, the preview card unmounts. No persistent preview state needed.

### 5. Profile Page Redesign

**Contributor card metrics:**

| Metric | Source | Query |
|--------|--------|-------|
| GitHub repos | `GitHubUser.public_repos` from GitHub API | Fetched server-side via `getGitHubUser(accessToken)` during page render |
| Contributed repos | Count of active synced repos | `SELECT COUNT(*) FROM repositories WHERE user_id = ? AND is_active = true` |
| Merged PRs | Count of visible PRs | `prsWithProfile.length` (already computed) |

**Card layout:**
```
┌──────────────────────────┐
│  [Avatar - larger]       │
│  Display Name            │
│  @username               │
│                          │
│  ┌───────┬───────┬─────┐ │
│  │ GitHub│Contrib│Merge│ │
│  │ Repos │ Repos │ PRs │ │
│  │  42   │  12   │ 156 │ │
│  └───────┴───────┴─────┘ │
│                          │
│  [Follow button]         │
│  [GitHub icon link]      │
└──────────────────────────┘
```

- Replace "Profile status" text with the 3-metric grid.
- Remove "View on GitHub" text button from profile card — keep only the GitHub icon link (already exists).
- Make the card more visually prominent with the 3-column stat row.

**PR card changes (PRCard.tsx):**
- Remove the entire `CardFooter` with "View on GitHub" text link.
- Add a small `<ExternalLink>` icon directly beside the PR title, linking to `pr.pr_url`.
- Keep the download button but move it to the card header area (top-right).

**Timeline animation:**
- Add IntersectionObserver-based scroll reveal to `Timeline.tsx`.
- Each PR card wrapper gets a `data-reveal` attribute.
- CSS classes: `opacity-0 translate-y-4` → `opacity-100 translate-y-0` with `transition-all duration-500`.
- Stagger via `transition-delay` based on visible index.
- Respect `prefers-reduced-motion`: skip animation, render visible immediately.
- No JS fallback: cards are visible by default, JS adds the hidden initial state only when IntersectionObserver is available.

**Profile screenshot preview:**
- Similar to per-repo preview but captures the contributor card + timeline.
- Add a "Download Portfolio" button on the profile page that captures a styled preview surface containing the card header and a truncated timeline (first N PRs).

### 6. Feed and Shared Rendering

**Feed PR cards** use the same `PRCard` component, so the icon-link change and repo avatar automatically apply.

**FeedClient.tsx** — no structural changes needed. The avatar data flows through the existing `PullRequestWithProfile` type augmented with repo avatar from the repositories table.

**Data augmentation strategy for feed:**
- The feed query already joins `pull_requests` with `profiles`.
- To get repo owner avatars, we need to join with `repositories` on `(user_id, repo_full_name)`.
- Add `owner_avatar_url` to the feed query's select clause via a nested join.
- This means `PullRequestWithProfile` gains an optional `repo_owner_avatar_url` field.

## Data Flow

### Sync Flow (persist range + avatar)

```
User selects "12m" → clicks Sync
  → POST /api/sync-prs { dateRange: "12m" }
    → searchMergedPRs() fetches repos + PRs from GitHub
    → For each repo: upsert repositories row (incl. owner_avatar_url)
    → Upsert sync_metadata { last_date_range: "12m" }
    → Return { synced, repos_found, message }
  → Client refetches GET /api/sync-prs
    → Returns { last_synced, total_prs, last_date_range: "12m" }
  → Settings summary shows "Last 12 months" (from persisted state)
```

### Feed/Profile Render Flow (with avatars)

```
Profile page loads
  → Query repositories WHERE user_id = ? AND is_active = true
  → Query pull_requests WHERE user_id = ?
  → Filter by active repos
  → For each PR: attach repo_owner_avatar_url from repositories lookup
  → Render Timeline → PRCard (with avatar icon)
```

## Error Handling

- **Sync metadata write failure:** Log warning but don't fail the sync. The range just won't persist — next GET returns `last_date_range: null`.
- **Avatar URL fetch failure during sync:** Store `null`. Fallback to text badge in rendering.
- **Screenshot capture failure:** Show inline error toast. Don't leave the preview card visible.
- **GitHub API rate limit during sync:** Already handled by existing error boundary in sync route. No change needed.
- **Missing GitHub user data for profile metrics:** Show "—" for the GitHub repos count. Other metrics are from local DB and always available.

## Testing Strategy

### Unit Tests

- **sync-metadata:** Test that POST sync-prs upserts `last_date_range`, and GET returns it.
- **PRCard:** Test that external link icon renders with correct `href`, and footer "View on GitHub" is absent.
- **repo-visibility:** Test avatar fallback when `owner_avatar_url` is null.

### Integration Tests

- **Settings flow:** Mock sync response with `last_date_range`, verify summary card displays mapped label. Change dropdown without syncing, verify summary doesn't update.
- **Profile metrics:** Mock repos/PRs data, verify 3-column stat row renders correct counts.
- **Feed with avatars:** Mock feed response with `owner_avatar_url`, verify avatar renders in PRCard.

### Visual/Manual Tests

- **Settings 2-column grid:** Resize browser, verify repo tiles go from 2-col to 1-col.
- **Timeline animation:** Scroll profile page, verify staggered fade-in. Test with `prefers-reduced-motion`.
- **Screenshot preview:** Click screenshot on repo tile, verify preview card renders and downloads correctly.

## Open Questions

1. **Profile screenshot scope:** Should the preview capture just the contributor card, or card + first N timeline items? Card-only is simpler and more shareable.

2. **GitHub repos metric:** Fetching `public_repos` requires an extra GitHub API call during profile render. Is the latency acceptable, or should we cache this in the profiles table during sync?

3. **Preview card styling for screenshots:** Should the preview card have app branding (logo/watermark), or be clean/brandless for maximum shareability?

4. **Timeline animation performance:** With 100+ PRs, IntersectionObserver on every card is fine, but should we virtualize the timeline for very large portfolios?
