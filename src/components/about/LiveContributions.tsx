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

const DESCRIPTION_CHAR_LIMIT = 100

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  )
}


const SKELETON_ITEMS = Array.from({ length: 6 }, (_, index) => index)

function formatRepoName(repoFullName: string) {
  const [orgName, repoName] = repoFullName.split('/')

  return { orgName, repoName }
}

function truncateDescription(text: string): string {
  if (text.length <= DESCRIPTION_CHAR_LIMIT) return text
  return text.slice(0, DESCRIPTION_CHAR_LIMIT).trimEnd() + '…'
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
          const { orgName, repoName } = formatRepoName(repo.repo_full_name)
          const description = truncateDescription(
            repo.description ?? 'Merged pull requests into a public open source repository.'
          )

          return (
            <Card key={repo.repo_full_name} className="gap-3 border border-border/80 py-0 shadow-sm shadow-black/5">
              <CardHeader className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GitHubIcon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                      {repoName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{orgName}</p>
                  </div>
                  <span className="inline-flex h-6 items-center rounded-full bg-[hsl(152,69%,45%,0.12)] px-2.5 text-xs font-medium text-[hsl(152,69%,32%)]">
                    {repo.pr_count} {repo.pr_count === 1 ? 'PR' : 'PRs'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <p className="text-sm leading-7 text-muted-foreground">{description}</p>
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
    </div>
  )
}
