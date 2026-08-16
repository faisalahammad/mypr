import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { AppShell } from '@/components/layout/AppShell'
import { getUserProfile } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Changelog — MyPR',
  description: 'Recent updates, features, and fixes shipped to mypr.pro.bd.',
  alternates: {
    canonical: 'https://mypr.pro.bd/changelog',
  },
}

interface UserProfile {
  github_username: string
  github_avatar_url: string | null
}

interface ChangelogEntry {
  date: string
  items: string[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: 'August 17, 2026',
    items: [
      'Navigation between pages is noticeably faster — profile, feed, and settings now load without redundant authentication round-trips.',
    ],
  },
  {
    date: 'August 10, 2026',
    items: [
      'Timeline month headers now show the total PR count for that month',
      'Each repo card in the profile repo grid has a copy button to grab all of that repo\'s PRs at once',
      'Repo names in the profile repo grid now link to the repository on GitHub',
    ],
  },
  {
    date: 'July 11, 2026',
    items: [
      'Profile timeline now groups pull requests by month for easier browsing',
      'Added quick copy actions on the profile page',
      'Repo grid on profile and settings can now expand to show more repositories',
    ],
  },
  {
    date: 'May 5, 2026',
    items: [
      'PRs now sync automatically on a daily schedule',
      'Added a Settings toggle to turn auto-sync on or off, with a persisted sync schedule',
      'Repo cards on the About page now show the GitHub icon and pull live descriptions from GitHub',
      'Cleaned up interactive elements with proper cursor styles across the app',
    ],
  },
  {
    date: 'April 23, 2026',
    items: [
      'Improved share variants for posting your PR timeline, with a restored "Copy URLs" button',
      'Fixed a hydration bug affecting the share modal',
    ],
  },
  {
    date: 'April 10, 2026',
    items: [
      'Added a "Lifetime PRs" summary card to your profile',
      'Refreshed the About page with live GitHub contribution data',
      'Polished feed cards and profile sharing UI',
      'Site rebranded to MyPR across metadata and branding',
    ],
  },
  {
    date: 'April 9, 2026',
    items: [
      'Launched the Home Feed: browse merged PRs from people you follow, with reactions',
      'Added a public About page',
      'Fixed the settings date range selector and profile timeline marker alignment',
      'Added support for showing only active repositories on public profiles',
    ],
  },
  {
    date: 'April 8, 2026',
    items: [
      'Redesigned the profile card with contribution metrics and repo avatars on the timeline',
      'Improved PR card layout with scroll animations',
      'Fixed OAuth login redirect and session persistence issues',
      'Improved mobile responsiveness across the site',
    ],
  },
]

export default async function ChangelogPage() {
  const currentUserProfile = (await getUserProfile()) as UserProfile | null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        username={currentUserProfile?.github_username ?? null}
        avatarUrl={currentUserProfile?.github_avatar_url ?? null}
      />

      <main className="flex-1 py-10">
        <AppShell>
          <div className="space-y-10">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Changelog</h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Recent features, improvements, and fixes shipped to MyPR.
              </p>
            </div>

            <div className="space-y-10">
              {CHANGELOG.map((entry) => (
                <section key={entry.date} aria-labelledby={`changelog-${entry.date}`} className="space-y-4">
                  <h2
                    id={`changelog-${entry.date}`}
                    className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {entry.date}
                  </h2>
                  <ul className="space-y-2 rounded-2xl border border-border/80 bg-card px-6 py-6">
                    {entry.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-foreground sm:text-base">
                        <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </AppShell>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}
