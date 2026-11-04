import Link from 'next/link'
import { ExternalLink, Settings } from 'lucide-react'
import { FollowButton } from '@/components/FollowButton'
import { ActivityGrid } from '@/components/profile/ActivityGrid'
import type { ProfileResultsModel } from '@/lib/profile-results'

interface ProfileHeaderProps {
  model: ProfileResultsModel
  profileId: string
  viewer: { id: string; isOwner: boolean; isFollowing: boolean } | null
}

const MAX_REPO_CHIPS = 4

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

function formatSynced(iso: string | null): string | null {
  if (!iso) return null
  const diffHours = Math.round((Date.parse(iso) - Date.now()) / 3600000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  return rtf.format(Math.round(diffHours / 24), 'day')
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
