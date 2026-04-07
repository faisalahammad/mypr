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

// Fetch all merged PRs across multiple repositories
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
  } catch (error) {
    return false
  }
}
