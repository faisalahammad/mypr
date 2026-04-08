// Shared TypeScript types for mypr.pro.bd

export interface Profile {
  id: string
  github_username: string
  github_avatar_url: string | null
  github_access_token: string | null
  display_name: string | null
  created_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Repository {
  id: string
  user_id: string
  repo_full_name: string
  is_active: boolean
  owner_avatar_url: string | null
  created_at: string
}

export interface PullRequest {
  id: string
  user_id: string
  repo_full_name: string
  pr_number: number
  title: string
  body_summary: string | null
  pr_url: string
  merged_at: string
  additions: number
  deletions: number
  commits_count: number
  synced_at: string
  source?: 'followed' | 'suggested'
}

export interface PullRequestWithProfile extends PullRequest {
  profile: {
    github_username: string
    github_avatar_url: string | null
    display_name: string | null
  }
  repo_owner_avatar_url?: string | null
}

export interface TimelineItem {
  pr: PullRequestWithProfile
  profile: {
    github_username: string
    github_avatar_url: string | null
    display_name: string | null
  }
}

export interface FeedItem {
  pr: PullRequestWithProfile
  isFollowing: boolean
}

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
  updated_at: string
}

export interface GitHubPR {
  id: number
  number: number
  title: string
  body: string | null
  html_url: string
  merged_at: string | null
  additions: number
  deletions: number
  commits: number
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

// Form types
export interface RepoSelectionForm {
  repos: string[]
}

export interface ProfileForm {
  display_name: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface SyncPRsResponse {
  synced: number
  failed: number
  errors: string[]
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[]
  hasMore: boolean
  nextPage: number | null
}

// Stats types
export interface UserStats {
  totalPRs: number
  totalAdditions: number
  totalDeletions: number
  totalCommits: number
  topRepos: Array<{
    repo_full_name: string
    count: number
  }>
}
