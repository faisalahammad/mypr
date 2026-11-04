import Link from 'next/link'
import type { Metadata } from 'next'
import { Search } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { AppShell } from '@/components/layout/AppShell'
import { FollowButton } from '@/components/FollowButton'
import { getExploreDevelopers } from '@/lib/explore'
import { getFollowingIds } from '@/lib/feed'
import { createSupabaseServerClient, getUserProfile } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Explore developers | MyPR',
  description: 'Find developers on MyPR and browse their merged pull requests.',
}

interface ExplorePageProps {
  searchParams: Promise<{ q?: string }>
}

function formatLastMerged(iso: string | null): string {
  if (!iso) return 'no public PRs yet'
  const days = Math.round((Date.parse(iso) - Date.now()) / 86400000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(days) < 30) return `last merged ${rtf.format(days, 'day')}`
  if (Math.abs(days) < 365) return `last merged ${rtf.format(Math.round(days / 30), 'month')}`
  return `last merged ${rtf.format(Math.round(days / 365), 'year')}`
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q = '' } = await searchParams
  const query = q.trim()
  const [developers, viewer] = await Promise.all([
    getExploreDevelopers(query),
    getUserProfile() as Promise<{ id: string; github_username: string; github_avatar_url: string | null } | null>,
  ])
  const followingIds = viewer
    ? new Set(await getFollowingIds(await createSupabaseServerClient(), viewer.id))
    : new Set<string>()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header username={viewer?.github_username ?? null} avatarUrl={viewer?.github_avatar_url ?? null} />

      <main className="flex-1 py-10">
        <AppShell className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">Explore developers</h1>
          <p className="mt-2 text-muted-foreground">
            {query ? `Developers matching “${query}”.` : 'Recently active developers on MyPR.'}
          </p>

          <form action="/explore" method="get" role="search" className="mt-6 flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search by GitHub username</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="explore-search"
                type="search"
                name="q"
                defaultValue={query}
                maxLength={39}
                placeholder="Search by GitHub username"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Search
            </button>
          </form>

          {developers.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="font-medium text-foreground">
                {query ? `No developers match “${query}”.` : 'No developers have shared PRs yet.'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? 'Check the spelling, or search for part of the username.' : 'Sign in with GitHub to be the first.'}
              </p>
            </div>
          ) : (
            <ul className="mt-8 grid gap-3">
              {developers.map((developer) => (
                <li
                  key={developer.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                >
                  {developer.github_avatar_url ? (
                    <img
                      src={`${developer.github_avatar_url}${developer.github_avatar_url.includes('?') ? '&' : '?'}s=80`}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium" aria-hidden="true">
                      {developer.github_username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/${developer.github_username}`} className="block truncate font-medium text-foreground hover:underline">
                      {developer.display_name || developer.github_username}
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">@{developer.github_username}</span>
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {developer.visible_prs} PR{developer.visible_prs === 1 ? '' : 's'} · {developer.repos} repo{developer.repos === 1 ? '' : 's'} · {formatLastMerged(developer.last_merged_at)}
                    </p>
                  </div>
                  {viewer && viewer.id !== developer.id ? (
                    <FollowButton targetUserId={developer.id} initialIsFollowing={followingIds.has(developer.id)} />
                  ) : !viewer ? (
                    <Link
                      href={`/${developer.github_username}`}
                      className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      View
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </AppShell>
      </main>

      <Footer />
    </div>
  )
}
