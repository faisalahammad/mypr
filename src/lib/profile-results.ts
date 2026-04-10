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

  return {
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
    shareVariants: [
      `A lot of my recent work shipped through open source: ${mergedPRs} merged PRs across ${repos} repos. See the work: mypr.pro.bd/${profile.github_username}`,
      `From fixes to shipped features, I’ve merged ${mergedPRs} PRs across ${repos} repos lately. See the work: mypr.pro.bd/${profile.github_username}`,
      `Here’s a snapshot of what I’ve been building in public: ${mergedPRs} merged PRs across ${repos} repos as @${profile.github_username}. See the work: mypr.pro.bd/${profile.github_username}`,
    ],
  }
}
