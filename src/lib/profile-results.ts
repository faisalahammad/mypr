import type { PullRequestWithProfile } from '@/types'

export type ProfileResultsView = 'repos' | 'summary' | 'timeline'

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

export function buildProfileResultsModel({
  profile,
  prs,
  contributedRepos,
}: BuildProfileResultsModelInput): ProfileResultsModel {
  const displayName = profile.display_name || profile.github_username
  const repoGroups = new Map<string, ProfileResultsModel['repoGrid'][number]>()

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

  const topRepositories = repoGrid.map((repo) => ({
    fullName: repo.fullName,
    count: repo.pullRequestCount,
  }))

  const mergedPRs = prs.length
  const repos = contributedRepos

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
