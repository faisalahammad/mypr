# Profile Results-Section Clone Spec

## Summary

Redesign [`src/app/[username]/page.tsx`](/Users/faisal/Coding/GitHub/mypr/src/app/[username]/page.tsx) so the main profile content becomes a strict port of the `#results` section from [`index.html`](/Users/faisal/Coding/GitHub/prcanvas/index.html), while keeping the existing site-level header, footer, and route shell.

The redesign should:

- Preserve the prototype’s visible structure: results header, action buttons, style tabs, preview card chrome, and the three views `Repo Grid`, `Summary Stats`, and `Timeline`.
- Use the app’s existing synced profile data, but narrow the presentation to the prototype’s content model rather than exposing richer current-card metadata.
- Keep `Tweet This` as a prototype-style modal with multiple generated variants.
- Keep `Screenshot` focused on the active preview card only.
- Add a two-layer cache for better UX: short-lived server cache plus client reuse of the normalized payload and active render state.
- Continue to respect the existing product rule that public profiles only show PRs from active repositories.

## Key Changes

### Page structure and styling

- Replace the current two-column profile card + timeline body with a single prototype-style results layout inside the existing app shell.
- Port the `#results` section styling system from the reference, including:
  - dark palette tokens
  - results header layout
  - action button styling
  - style-tab switcher
  - browser-window preview card chrome
  - per-view visual treatments
- Scope the imported visual system to the profile results experience so it does not leak into the rest of the app shell.

### Data shaping

- Build a normalized profile-results payload from the current profile route query output:
  - identity block: avatar, display name, username
  - counters: merged PR count, active repo count
  - repo grid data: grouped by repo, sorted by PR count desc
  - summary data: totals and top repositories shaped to match the reference summary presentation
  - timeline data: reverse-chronological merged PR entries shaped for the prototype-style timeline
- Keep active-repo filtering exactly as it works now.
- Do not surface existing PR-card-only details such as additions, deletions, commits, or per-card download actions in the clone unless they are required for hidden data processing.

### Interactions

- Default the page to `Repo Grid` on every load, even for repeat visitors.
- `Tweet This` opens a modal with multiple prewritten variants derived from the normalized payload, matching the prototype pattern.
- `Screenshot` captures only the active preview card.
- Timeline export behavior should clamp or compress the share artifact when the on-screen timeline is long, so the PNG remains readable and prototype-like.
- Keep on-screen long timelines renderable without forcing a hard content limit in the main UI.

### Caching

- Add short-TTL server caching for the normalized public profile payload.
- Add client-side reuse of the last normalized payload and current rendered view state needed for instant tab switches, tweet generation, and screenshot capture.
- Invalidate the server cache on:
  - PR sync completion
  - repo visibility changes
  - TTL expiry as fallback
- The intended behavior is “fresh enough within minutes, instant within a session.”

## Public Interfaces and Internal Contracts

- The route remains [`src/app/[username]/page.tsx`](/Users/faisal/Coding/GitHub/mypr/src/app/[username]/page.tsx); no URL change.
- Introduce a dedicated normalized view model for the results clone, rather than passing raw PR rows directly into each tab.
- Keep existing follow behavior only if it can live outside the strict results clone surface without altering the prototype body. If it conflicts with the strict clone body, omit it from the main results block and keep GitHub/profile identity as the visible header actions.
- Reuse or extend the existing image export helper in [`src/lib/utils.ts`](/Users/faisal/Coding/GitHub/mypr/src/lib/utils.ts) so capture targets can be card-scoped rather than page-scoped.
- Replace the current timeline-only client wrapper in [`src/components/timeline/DownloadableTimeline.tsx`](/Users/faisal/Coding/GitHub/mypr/src/components/timeline/DownloadableTimeline.tsx) with a results-level client controller, or subsume its responsibilities into a new profile-results client component.

## Test Plan

- Profile route renders the prototype-style results structure for a valid user.
- Default selected tab is `Repo Grid`.
- Header metadata shows avatar, display name, `@username`, merged PR total, and active repo total.
- Repo grid groups PRs by repo and sorts by merged PR count descending.
- Summary view renders normalized totals and top repos from the same payload as the other views.
- Timeline view renders merged PRs in reverse chronological order.
- `Tweet This` opens a modal and shows multiple generated variants.
- `Screenshot` targets only the active preview card, not the entire page shell.
- Long timeline export is constrained for shareability while the on-screen timeline remains navigable.
- Cache behavior:
  - repeat request within TTL reuses cached server payload
  - sync and repo-visibility mutations invalidate cached profile payload
  - client tab switches and share actions do not trigger unnecessary refetches

## Assumptions and Defaults

- “Exactly same” means strict fidelity to the reference `#results` section for structure and interaction patterns, not a loose inspiration.
- The redesign replaces only the profile route’s main content area, not the global site shell.
- Active repositories remain the canonical dataset for public profile rendering.
- The share artifact is the active preview card only.
- Tweet UX matches the reference modal pattern.
- Cache strategy is server + client, with short freshness windows and event-driven invalidation.
- Every visit starts on `Repo Grid`; no remembered tab state.
