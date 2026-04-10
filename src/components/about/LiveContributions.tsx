'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ContributionRepo {
  repo_full_name: string
  pr_count: number
  description?: string
}

interface ContributionsResponse {
  repos: ContributionRepo[]
  total: number
  last_updated: string
}

const REPO_DESCRIPTIONS: Record<string, string> = {
  'ibericode/mc4wp': 'The most popular Mailchimp integration plugin for WordPress.',
  'ultimatemember/ultimatemember': 'A leading user profile and membership plugin for WordPress.',
  'pods-framework/pods': 'A powerful content type and custom fields framework for WordPress.',
  'gocodebox/lifterlms': 'A powerful LMS plugin for WordPress for creating and selling courses.',
  'litespeedtech/lscache_wp': 'The official cache plugin for LiteSpeed web servers.',
  'WordPress/classic-editor': 'The official WordPress plugin restoring the classic editing experience.',
}

const SKELETON_ITEMS = Array.from({ length: 6 }, (_, index) => index)

function formatRepoName(repoFullName: string) {
  const [orgName, repoName] = repoFullName.split('/')

  return {
    orgName,
    repoName,
    description:
      REPO_DESCRIPTIONS[repoFullName] ??
      'Merged pull requests into a public open source repository in the WordPress ecosystem.',
  }
}

export function LiveContributions() {
  const [data, setData] = useState<ContributionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadContributions() {
      try {
        const response = await fetch('/api/about/contributions', {
          method: 'GET',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load contributions')
        }

        const payload = (await response.json()) as ContributionsResponse
        setData(payload)
        setHasError(false)
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setHasError(true)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadContributions()

    return () => {
      controller.abort()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SKELETON_ITEMS.map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/5"
            />
          ))}
        </div>
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-52 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (hasError || !data) {
    return (
      <p className="rounded-2xl border border-border/80 bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm shadow-black/5">
        Live contribution data is temporarily unavailable. Please check back later for the latest merged pull
        request totals.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.repos.map((repo) => {
          const { orgName, repoName, description } = formatRepoName(repo.repo_full_name)

          return (
            <Card key={repo.repo_full_name} className="gap-3 border border-border/80 py-0 shadow-sm shadow-black/5">
              <CardHeader className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{repoName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{orgName}</p>
                  </div>
                  <span className="inline-flex h-6 items-center rounded-full bg-[hsl(152,69%,45%,0.12)] px-2.5 text-xs font-medium text-[hsl(152,69%,32%)]">
                    {repo.pr_count} {repo.pr_count === 1 ? 'PR' : 'PRs'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <p className="text-sm leading-7 text-muted-foreground">{repo.description ?? description}</p>
                <a
                  href={`https://github.com/${repo.repo_full_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View repository
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-sm font-medium text-foreground">
        Total: {data.total} merged pull requests across {data.repos.length} plugins
      </p>
      <p className="text-xs text-muted-foreground">Last synced from mypr.pro.bd · Updates daily</p>
    </div>
  )
}
