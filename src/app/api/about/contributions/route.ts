import { createSupabaseServiceClient } from '@/lib/supabase'

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

const fallbackData: {
  repos: ContributionRepo[]
  total: number
  last_updated: string
} = {
  repos: [
    {
      repo_full_name: 'ibericode/mc4wp',
      pr_count: 8,
      description: 'The most popular Mailchimp integration plugin for WordPress.',
    },
    {
      repo_full_name: 'ultimatemember/ultimatemember',
      pr_count: 2,
      description: 'A leading user profile and membership plugin for WordPress.',
    },
    {
      repo_full_name: 'pods-framework/pods',
      pr_count: 2,
      description: 'A powerful content type and custom fields framework for WordPress.',
    },
    {
      repo_full_name: 'gocodebox/lifterlms',
      pr_count: 2,
      description: 'A powerful LMS plugin for WordPress for creating and selling courses.',
    },
    {
      repo_full_name: 'litespeedtech/lscache_wp',
      pr_count: 1,
      description: 'The official cache plugin for LiteSpeed web servers.',
    },
    {
      repo_full_name: 'WordPress/classic-editor',
      pr_count: 1,
      description: 'The official WordPress plugin restoring the classic editing experience.',
    },
  ],
  total: 16,
  last_updated: new Date().toISOString(),
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

    const repos = Array.from(repoCounts.entries())
      .map(([repo_full_name, pr_count]) => ({ repo_full_name, pr_count }))
      .sort((left, right) => {
        if (right.pr_count === left.pr_count) {
          return left.repo_full_name.localeCompare(right.repo_full_name)
        }

        return right.pr_count - left.pr_count
      })

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
