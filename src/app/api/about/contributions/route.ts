import { createSupabaseServiceClient } from '@/lib/supabase'

const DESCRIPTION_CHAR_LIMIT = 100

interface ContributionRepo {
  repo_full_name: string
  pr_count: number
  description?: string
}

interface ProfileRow {
  id: string
}

interface PullRequestRow {
  repo_full_name: string
  synced_at: string
}

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  'ibericode/mc4wp': 'The most popular Mailchimp integration plugin for WordPress.',
  'ultimatemember/ultimatemember': 'A leading user profile and membership plugin for WordPress.',
  'pods-framework/pods': 'A powerful content type and custom fields framework for WordPress.',
  'gocodebox/lifterlms': 'A powerful LMS plugin for WordPress for creating and selling courses.',
  'litespeedtech/lscache_wp': 'The official cache plugin for LiteSpeed web servers.',
  'WordPress/classic-editor': 'The official WordPress plugin restoring the classic editing experience.',
}

const fallbackData: {
  repos: ContributionRepo[]
  total: number
  last_updated: string
} = {
  repos: [
    { repo_full_name: 'ibericode/mc4wp', pr_count: 8, description: FALLBACK_DESCRIPTIONS['ibericode/mc4wp'] },
    { repo_full_name: 'ultimatemember/ultimatemember', pr_count: 2, description: FALLBACK_DESCRIPTIONS['ultimatemember/ultimatemember'] },
    { repo_full_name: 'pods-framework/pods', pr_count: 2, description: FALLBACK_DESCRIPTIONS['pods-framework/pods'] },
    { repo_full_name: 'gocodebox/lifterlms', pr_count: 2, description: FALLBACK_DESCRIPTIONS['gocodebox/lifterlms'] },
    { repo_full_name: 'litespeedtech/lscache_wp', pr_count: 1, description: FALLBACK_DESCRIPTIONS['litespeedtech/lscache_wp'] },
    { repo_full_name: 'WordPress/classic-editor', pr_count: 1, description: FALLBACK_DESCRIPTIONS['WordPress/classic-editor'] },
  ],
  total: 16,
  last_updated: new Date().toISOString(),
}

function truncateDescription(text: string): string {
  if (text.length <= DESCRIPTION_CHAR_LIMIT) return text
  return text.slice(0, DESCRIPTION_CHAR_LIMIT).trimEnd() + '…'
}

async function fetchGitHubDescription(repoFullName: string): Promise<string> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return FALLBACK_DESCRIPTIONS[repoFullName] ?? 'An open source project in the WordPress ecosystem.'
    }

    const data = (await response.json()) as { description?: string }
    const description = data.description?.trim()

    if (!description) {
      return FALLBACK_DESCRIPTIONS[repoFullName] ?? 'An open source project in the WordPress ecosystem.'
    }

    return truncateDescription(description)
  } catch {
    return FALLBACK_DESCRIPTIONS[repoFullName] ?? 'An open source project in the WordPress ecosystem.'
  }
}

const responseHeaders = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
}

export async function GET() {
  const supabase = createSupabaseServiceClient()

  try {
    const { data: profileResult } = await supabase
      .from('profiles')
      .select('id')
      .eq('github_username', 'faisalahammad')
      .maybeSingle()

    const profile = profileResult as ProfileRow | null

    if (!profile) {
      return Response.json(fallbackData, { headers: responseHeaders })
    }

    const { data: pullRequests, error: pullRequestsError } = await supabase
      .from('pull_requests')
      .select('repo_full_name, synced_at')
      .eq('user_id', profile.id)
      .returns<PullRequestRow[]>()

    if (pullRequestsError || !pullRequests || pullRequests.length === 0) {
      return Response.json(fallbackData, { headers: responseHeaders })
    }

    const repoCounts = new Map<string, number>()
    let lastUpdated = pullRequests[0]?.synced_at ?? new Date().toISOString()

    for (const pullRequest of pullRequests) {
      repoCounts.set(pullRequest.repo_full_name, (repoCounts.get(pullRequest.repo_full_name) ?? 0) + 1)

      if (new Date(pullRequest.synced_at).getTime() > new Date(lastUpdated).getTime()) {
        lastUpdated = pullRequest.synced_at
      }
    }

    const repoEntries = Array.from(repoCounts.entries())
      .sort((left, right) => {
        if (right[1] === left[1]) {
          return left[0].localeCompare(right[0])
        }

        return right[1] - left[1]
      })

    const repos = await Promise.all(
      repoEntries.map(async ([repo_full_name, pr_count]) => ({
        repo_full_name,
        pr_count,
        description: await fetchGitHubDescription(repo_full_name),
      }))
    )

    return Response.json(
      {
        repos,
        total: pullRequests.length,
        last_updated: lastUpdated,
      },
      { headers: responseHeaders }
    )
  } catch {
    return Response.json(fallbackData, { headers: responseHeaders })
  }
}
