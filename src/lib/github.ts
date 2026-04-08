import { Octokit } from 'octokit'

// Types for GitHub API responses
export interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  name: string | null
  bio: string | null
  public_repos: number
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  visibility: string
  updated_at: string
  is_active?: boolean
  pr_count?: number
}

export type DateRange = '1m' | '3m' | '6m' | '12m' | '24m' | 'lifetime'

export const getDateRangeStart = (range: DateRange): string | null => {
  if (range === 'lifetime') return null
  const months = { '1m': 1, '3m': 3, '6m': 6, '12m': 12, '24m': 24 }[range]
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

// Represents a PR returned from GitHub's search API
export interface GitHubSearchPR {
  number: number
  title: string
  body: string | null
  html_url: string
  pull_request: {
    merged_at: string | null
  }
  repository_url: string
  state: string
  user: {
    login: string
    avatar_url: string
  }
}

export interface GitHubPRListItem {
  id: number
  number: number
  title: string
  body: string | null
  html_url: string
  merged_at: string | null
  additions?: number
  deletions?: number
  commits?: number
  user: {
    login: string
    avatar_url: string
  }
  base: {
    repo: {
      full_name: string
    }
  }
}

export interface GitHubPR extends GitHubPRListItem {
  additions: number
  deletions: number
  commits: number
}

interface GitHubPRDetail {
  additions?: number
  deletions?: number
  commits?: number
}

// Create authenticated Octokit instance
export const createOctokit = (accessToken: string) => {
  return new Octokit({
    auth: accessToken
  })
}

// Fetch authenticated user
export const getGitHubUser = async (accessToken: string): Promise<GitHubUser> => {
  const octokit = createOctokit(accessToken)
  const { data } = await octokit.request('GET /user', {
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  return data as GitHubUser
}

// Fetch user's public repositories
export const getUserRepos = async (
  accessToken: string,
  username: string
): Promise<GitHubRepo[]> => {
  const octokit = createOctokit(accessToken)
  const { data } = await octokit.request('GET /users/{username}/repos', {
    username,
    type: 'all' as const,
    sort: 'updated',
    per_page: 100,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  return data as GitHubRepo[]
}

// Fetch merged pull requests for a repository
export const getMergedPRs = async (
  accessToken: string,
  repoFullName: string,
  username: string
): Promise<GitHubPR[]> => {
  const octokit = createOctokit(accessToken)
  const [owner, repo] = repoFullName.split('/')

  const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
    owner,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  // Filter for merged PRs by this user
  const mergedPRs = (data as GitHubPRListItem[]).filter(
    pr => pr.merged_at && pr.user.login === username
  )

  // Ensure all PRs have the required fields (set defaults if missing)
  return mergedPRs.map(pr => ({
    ...pr,
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    commits: pr.commits ?? 0
  })) as GitHubPR[]
}

// Fetch PR body summary (first 150 characters)
export const getPRSummary = (body: string | null): string => {
  if (!body) return ''
  return body.substring(0, 150) + (body.length > 150 ? '...' : '')
}

// Fetch all merged PRs across multiple repositories (used for legacy/fallback)
export const getAllMergedPRs = async (
  accessToken: string,
  repos: string[],
  username: string
): Promise<GitHubPR[]> => {
  const allPRs: GitHubPR[] = []

  for (const repoFullName of repos) {
    try {
      const prs = await getMergedPRs(accessToken, repoFullName, username)
      allPRs.push(...prs)
    } catch (error) {
      console.error(`Error fetching PRs for ${repoFullName}:`, error)
      // Continue with other repos even if one fails
    }
  }

  // Sort by merged date descending
  return allPRs.sort((a, b) =>
    new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime()
  )
}

/**
 * Search for PRs that the user authored and that were merged.
 * Uses GitHub's Search API — much more efficient than iterating over repos.
 * Returns structured PR data grouped by repository.
 */
export interface MergedPR {
  pr_number: number
  title: string
  body: string | null
  html_url: string
  merged_at: string
  repo_full_name: string
  additions: number
  deletions: number
  commits: number
}

export interface RepoWithPRs {
  repo_full_name: string
  description: string | null
  owner_avatar_url: string | null
  prs: MergedPR[]
}

export const searchMergedPRs = async (
  accessToken: string,
  username: string,
  dateRange: DateRange
): Promise<RepoWithPRs[]> => {
  const octokit = createOctokit(accessToken)
  const dateStart = getDateRangeStart(dateRange)

  // Build query: authored by user and merged.
  let query = `type:pr author:${username} is:merged`
  if (dateStart) {
    query += ` merged:>=${dateStart}`
  }

  const allItems: GitHubSearchPR[] = []
  let page = 1
  const perPage = 100

  // Paginate through all results (GitHub search API returns max 1000 results)
  while (true) {
    const { data } = await octokit.request('GET /search/issues', {
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: perPage,
      page,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' }
    })

    const items = data.items as GitHubSearchPR[]
    allItems.push(...items)

    if (items.length < perPage) break
    page++
    // GitHub enforces a 1000-result cap on search
    if (page * perPage >= 1000) break
  }

  // Filter to only truly merged PRs (search returns closed too sometimes)
  const mergedItems = allItems.filter(item => item.pull_request?.merged_at)

  // Extract repo full name from repository_url
  // e.g. https://api.github.com/repos/owner/repo → owner/repo
  const extractRepoName = (url: string) => url.replace('https://api.github.com/repos/', '')

  // Fetch PR details (additions/deletions/commits) in parallel batches
  // We batch to avoid flooding the API
  const BATCH_SIZE = 10
  const detailedPRs: MergedPR[] = []

  for (let i = 0; i < mergedItems.length; i += BATCH_SIZE) {
    const batch = mergedItems.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const repoFullName = extractRepoName(item.repository_url)
        const [owner, repo] = repoFullName.split('/')
        try {
          const { data: prDetail } = await octokit.request(
            'GET /repos/{owner}/{repo}/pulls/{pull_number}',
            {
              owner,
              repo,
              pull_number: item.number,
              headers: { 'X-GitHub-Api-Version': '2022-11-28' }
            }
          )
          return {
            pr_number: item.number,
            title: item.title,
            body: item.body,
            html_url: item.html_url,
            merged_at: item.pull_request.merged_at!,
            repo_full_name: repoFullName,
            additions: (prDetail as GitHubPRDetail).additions ?? 0,
            deletions: (prDetail as GitHubPRDetail).deletions ?? 0,
            commits: (prDetail as GitHubPRDetail).commits ?? 0,
          } as MergedPR
        } catch {
          // If detail fetch fails, still include the PR with 0 stats
          return {
            pr_number: item.number,
            title: item.title,
            body: item.body,
            html_url: item.html_url,
            merged_at: item.pull_request.merged_at!,
            repo_full_name: repoFullName,
            additions: 0,
            deletions: 0,
            commits: 0,
          } as MergedPR
        }
      })
    )
    detailedPRs.push(...batchResults)
  }

  // Group by repository
  const repoMap = new Map<string, MergedPR[]>()
  for (const pr of detailedPRs) {
    if (!repoMap.has(pr.repo_full_name)) {
      repoMap.set(pr.repo_full_name, [])
    }
    repoMap.get(pr.repo_full_name)!.push(pr)
  }

  const reposWithMetadata = await Promise.all(
    Array.from(repoMap.entries()).map(async ([repo_full_name, prs]) => {
      const [owner, repo] = repo_full_name.split('/')
      let description: string | null = null
      let owner_avatar_url: string | null = null

      try {
        const { data: repoData } = await octokit.request('GET /repos/{owner}/{repo}', {
          owner,
          repo,
          headers: { 'X-GitHub-Api-Version': '2022-11-28' }
        })
        const typed = repoData as { description?: string | null; owner?: { avatar_url?: string | null } }
        description = typed.description ?? null
        owner_avatar_url = typed.owner?.avatar_url ?? null
      } catch {
        description = null
      }

      return {
        repo_full_name,
        description,
        owner_avatar_url,
        prs: prs.sort((a, b) => new Date(b.merged_at).getTime() - new Date(a.merged_at).getTime())
      } as RepoWithPRs
    })
  )

  return reposWithMetadata
}

// Fetch users that the authenticated user is following on GitHub
export const getGitHubFollowing = async (accessToken: string): Promise<string[]> => {
  const octokit = createOctokit(accessToken)
  const logins: string[] = []
  let page = 1

  while (true) {
    const { data } = await octokit.request('GET /user/following', {
      per_page: 100,
      page,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' }
    })
    if (!data.length) break
    data.forEach((u: { login: string }) => logins.push(u.login))
    if (data.length < 100) break
    page++
  }

  return logins
}

// Validate GitHub access token
export const validateToken = async (accessToken: string): Promise<boolean> => {
  try {
    const octokit = createOctokit(accessToken)
    await octokit.request('GET /user', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return true
  } catch {
    return false
  }
}
