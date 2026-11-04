import Link from 'next/link'
import { ExternalLink, Settings } from 'lucide-react'
import { FollowButton } from '@/components/FollowButton'
import type { ProfileResultsModel } from '@/lib/profile-results'
import { cn } from '@/lib/utils'

interface ProfileHeaderProps {
  model: ProfileResultsModel
  profileId: string
  viewer: { id: string; isOwner: boolean; isFollowing: boolean } | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_REPO_CHIPS = 4

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

function formatSynced(iso: string | null): string | null {
  if (!iso) return null
  const diffHours = Math.round((Date.parse(iso) - Date.now()) / 3600000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  return rtf.format(Math.round(diffHours / 24), 'day')
}

function levelClass(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-primary/30'
  if (count <= 3) return 'bg-primary/60'
  return 'bg-primary'
}

/** GitHub-style grid: 53 week columns x 7 weekday rows, ending today (UTC). */
export function ActivityGrid({ activity }: { activity: Record<string, number> }) {
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  // Start on the Sunday 52 weeks before this week's Sunday
  const start = todayUtc - (today.getUTCDay() + 52 * 7) * DAY_MS
  const days: Array<{ key: string; count: number; future: boolean }> = []

  for (let time = start; time < start + 53 * 7 * DAY_MS; time += DAY_MS) {
    const key = new Date(time).toISOString().slice(0, 10)
    days.push({ key, count: activity[key] ?? 0, future: time > todayUtc })
  }

  const total = days.reduce((sum, day) => sum + day.count, 0)

  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
          role="img"
          aria-label={`${total} merged pull requests in the last year`}
        >
          {days.map((day) => (
            <span
              key={day.key}
              title={day.future ? undefined : `${day.count} PR${day.count === 1 ? '' : 's'} on ${day.key}`}
              className={cn('h-[11px] w-[11px] rounded-[2px]', day.future ? 'bg-transparent' : levelClass(day.count))}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{total} merged PR{total === 1 ? '' : 's'} in the last year</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          Less
          {[0, 1, 2, 4].map((count) => (
            <span key={count} className={cn('h-[11px] w-[11px] rounded-[2px]', levelClass(count))} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}

export function ProfileHeader({ model, profileId, viewer }: ProfileHeaderProps) {
  const { identity, counts, stats, summary } = model
  const synced = formatSynced(stats.lastSyncedAt)
  const repoChips = summary.topRepositories.slice(0, MAX_REPO_CHIPS)
  const moreRepos = summary.topRepositories.length - repoChips.length

  return (
    <section className="mb-8 grid gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Profile">
      <div className="flex flex-wrap items-center gap-4">
        {identity.avatarUrl ? (
          <img
            src={`${identity.avatarUrl}${identity.avatarUrl.includes('?') ? '&' : '?'}s=144`}
            alt={identity.displayName}
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-full object-cover"
          />
        ) : (
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground" aria-hidden="true">
            {identity.username.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{identity.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            @{identity.username}
            {synced ? ` · synced ${synced}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewer?.isOwner ? (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Manage repos
            </Link>
          ) : viewer ? (
            <FollowButton targetUserId={profileId} initialIsFollowing={viewer.isFollowing} />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Follow
            </Link>
          )}
          <a
            href={`https://github.com/${identity.username}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            GitHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'merged PRs', value: counts.mergedPRs.toLocaleString('en') },
          { label: 'repos', value: counts.repos.toLocaleString('en') },
          { label: 'lines added', value: `+${compactNumber.format(stats.linesAdded)}` },
        ].map((item) => (
          <div key={item.label} className="grid rounded-xl bg-muted/60 px-3 py-3">
            <dd className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">{item.value}</dd>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
          </div>
        ))}
      </dl>

      {repoChips.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Top repositories">
          {repoChips.map((repo) => (
            <li key={repo.fullName}>
              <a
                href={`https://github.com/${repo.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
              >
                {repo.fullName} · {repo.count}
              </a>
            </li>
          ))}
          {moreRepos > 0 ? (
            <li className="inline-flex rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
              +{moreRepos} more
            </li>
          ) : null}
        </ul>
      ) : null}

      <ActivityGrid activity={model.activity} />
    </section>
  )
}
