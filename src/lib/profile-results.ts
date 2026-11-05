import type { PullRequestWithProfile } from '@/types'

export type ProfileResultsView = 'repos' | 'summary' | 'timeline'

export interface ActivityDayPR {
  number: number
  title: string
}

export interface ProfileResultsModel {
  identity: {
    avatarUrl: string | null
    displayName: string
    username: string
  }
  counts: {
    mergedPRs: number
    repos: number
  }
  stats: {
    linesAdded: number
    linesRemoved: number
    lastSyncedAt: string | null
  }
  /** Merged PRs per UTC day (YYYY-MM-DD) over the last 366 days */
  activity: Record<string, ActivityDayPR[]>
  repoGrid: Array<{
    fullName: string
    name: string
    org: string
    pullRequestCount: number
    pullRequests: Array<{
      number: number
      title: string
      url: string
    }>
  }>
  summary: {
    mergedPRs: number
    repos: number
    topRepositories: Array<{
      fullName: string
      count: number
    }>
  }
  timeline: Array<{
    id: string
    title: string
    number: number
    repoFullName: string
    url: string
    mergedAt: string
  }>
  timelineByMonth: Array<{
    key: string
    label: string
    entries: Array<{
      id: string
      title: string
      number: number
      repoFullName: string
      url: string
      mergedAt: string
    }>
  }>
  shareVariants: string[]
}

interface BuildProfileResultsModelInput {
  profile: {
    github_username: string
    github_avatar_url: string | null
    display_name: string | null
  }
  prs: PullRequestWithProfile[]
  contributedRepos: number
}

export const PROFILE_RESULTS_REVALIDATE_SECONDS = 300

export function getProfileResultsTag(username: string): string {
  return `profile-results:${username.toLowerCase()}`
}

const previewLabels: Record<ProfileResultsView, string> = {
  repos: 'Repository highlights preview',
  summary: 'Top repositories snapshot',
  timeline: 'Contribution timeline preview',
}

export function getProfileResultsPreviewLabel(view: ProfileResultsView): string {
  return previewLabels[view]
}

const MAX_TWEET_LENGTH = 280

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength - 3)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...'
  }
  return truncated + '...'
}

export function generateShareVariants(
  model: ProfileResultsModel,
  username: string
): string[] {
  const { mergedPRs, repos } = model.counts
  const topRepo = model.summary.topRepositories[0]
  const secondRepo = model.summary.topRepositories[1]
  const latestPR = model.timeline[0]
  const isDominant = topRepo && mergedPRs > 0 && topRepo.count / mergedPRs > 0.6
  const hasMultipleRepos = repos > 1
  const hasMultiplePRs = mergedPRs > 1

  const url = `mypr.pro.bd/${username}`
  const variants: string[] = []

  const add = (text: string) => {
    variants.push(truncate(text, MAX_TWEET_LENGTH))
  }

  if (hasMultipleRepos && secondRepo) {
    add(`Most of my recent open source work shipped through ${topRepo.fullName} and ${secondRepo.fullName} — ${mergedPRs} merged PRs across ${repos} repos. See the work: ${url}`)
  } else if (topRepo) {
    add(`Most of my recent open source work shipped through ${topRepo.fullName} — ${mergedPRs} merged PR${hasMultiplePRs ? 's' : ''} across ${repos} repo${hasMultipleRepos ? 's' : ''}. See the work: ${url}`)
  }

  if (latestPR) {
    if (hasMultiplePRs) {
      add(`Just shipped: ${latestPR.title} (and ${mergedPRs - 1} more PR${mergedPRs - 1 > 1 ? 's' : ''}). See the work: ${url}`)
    } else {
      add(`Just shipped my first PR: ${latestPR.title}. See the work: ${url}`)
    }
  }

  if (topRepo) {
    add(`Crossed ${mergedPRs} merged PR${hasMultiplePRs ? 's' : ''} across ${repos} repo${hasMultipleRepos ? 's' : ''} lately. Top project: ${topRepo.fullName}. See the work: ${url}`)
  }

  add(`What I've been building in public: ${mergedPRs} merged PR${hasMultiplePRs ? 's' : ''} across ${repos} repo${hasMultipleRepos ? 's' : ''} as @${username}. See the work: ${url}`)

  if (hasMultipleRepos && secondRepo) {
    add(`Contributing across ${repos} repos lately, from ${topRepo.fullName} to ${secondRepo.fullName}. ${mergedPRs} merged PR${hasMultiplePRs ? 's' : ''} in total. See the work: ${url}`)
  } else if (topRepo) {
    add(`Focused on ${topRepo.fullName} lately with ${mergedPRs} merged PR${hasMultiplePRs ? 's' : ''}. See the work: ${url}`)
  }

  if (isDominant && topRepo) {
    add(`Most of my open source work lately goes into ${topRepo.fullName} — ${mergedPRs} merged PR${hasMultiplePRs ? 's' : ''} (and counting). See the work: ${url}`)
  }

  return variants.slice(0, 6)
}

/** What the client ProfileResults receives: views derivable from `timeline` are dropped so each PR is serialized once */
export type ProfileResultsClientModel = Omit<ProfileResultsModel, 'activity' | 'repoGrid' | 'timelineByMonth'>

export function toProfileResultsClientModel(model: ProfileResultsModel): ProfileResultsClientModel {
  const { identity, counts, stats, summary, timeline, shareVariants } = model
  return { identity, counts, stats, summary, timeline, shareVariants }
}

/** Groups a newest-first timeline by repository and by UTC month */
export function deriveTimelineViews(
  timeline: ProfileResultsModel['timeline']
): Pick<ProfileResultsModel, 'repoGrid' | 'timelineByMonth'> {
  const repoGroups = new Map<string, ProfileResultsModel['repoGrid'][number]>()

  for (const pr of timeline) {
    const [org = 'unknown', name = 'unknown'] = pr.repoFullName.split('/')
    const existing = repoGroups.get(pr.repoFullName)
    if (existing) {
      existing.pullRequestCount += 1
      existing.pullRequests.push({
        number: pr.number,
        title: pr.title,
        url: pr.url,
      })
      continue
    }

    repoGroups.set(pr.repoFullName, {
      fullName: pr.repoFullName,
      name,
      org,
      pullRequestCount: 1,
      pullRequests: [
        {
          number: pr.number,
          title: pr.title,
          url: pr.url,
        },
      ],
    })
  }

  const repoGrid = Array.from(repoGroups.values()).sort((a, b) => {
    if (b.pullRequestCount !== a.pullRequestCount) {
      return b.pullRequestCount - a.pullRequestCount
    }
    return a.fullName.localeCompare(b.fullName)
  })

  const monthGroups = new Map<string, ProfileResultsModel['timelineByMonth'][number]>()
  for (const entry of timeline) {
    const mergedDate = new Date(entry.mergedAt)
    const key = `${mergedDate.getUTCFullYear()}-${String(mergedDate.getUTCMonth() + 1).padStart(2, '0')}`
    const existing = monthGroups.get(key)
    if (existing) {
      existing.entries.push(entry)
      continue
    }

    monthGroups.set(key, {
      key,
      label: mergedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' }),
      entries: [entry],
    })
  }

  const timelineByMonth = Array.from(monthGroups.values())

  return { repoGrid, timelineByMonth }
}

export function buildProfileResultsModel({
  profile,
  prs,
  contributedRepos,
}: BuildProfileResultsModelInput): ProfileResultsModel {
  const displayName = profile.display_name || profile.github_username

  const timeline = [...prs]
    .sort((a, b) => new Date(b.merged_at).getTime() - new Date(a.merged_at).getTime())
    .map((pr) => ({
      id: pr.id,
      title: pr.title,
      number: pr.pr_number,
      repoFullName: pr.repo_full_name,
      url: pr.pr_url,
      mergedAt: pr.merged_at,
    }))

  const { repoGrid, timelineByMonth } = deriveTimelineViews(timeline)

  const topRepositories = repoGrid.map((repo) => ({
    fullName: repo.fullName,
    count: repo.pullRequestCount,
  }))

  const mergedPRs = prs.length
  const repos = contributedRepos

  const activityStart = Date.now() - 366 * 24 * 60 * 60 * 1000
  const activity: Record<string, ActivityDayPR[]> = {}
  let linesAdded = 0
  let linesRemoved = 0
  let lastSyncedAt: string | null = null
  for (const pr of prs) {
    linesAdded += pr.additions ?? 0
    linesRemoved += pr.deletions ?? 0
    if (pr.synced_at && (!lastSyncedAt || pr.synced_at > lastSyncedAt)) lastSyncedAt = pr.synced_at
    if (Date.parse(pr.merged_at) >= activityStart) {
      const day = pr.merged_at.slice(0, 10)
      activity[day] ??= []
      activity[day].push({ number: pr.pr_number, title: pr.title })
    }
  }

  const model: ProfileResultsModel = {
    identity: {
      avatarUrl: profile.github_avatar_url,
      displayName,
      username: profile.github_username,
    },
    counts: {
      mergedPRs,
      repos,
    },
    stats: {
      linesAdded,
      linesRemoved,
      lastSyncedAt,
    },
    activity,
    repoGrid,
    summary: {
      mergedPRs,
      repos,
      topRepositories,
    },
    timeline,
    timelineByMonth,
    shareVariants: [],
  }

  model.shareVariants = generateShareVariants(model, profile.github_username)

  return model
}
