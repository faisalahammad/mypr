'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import type { PullRequest } from '@/types'

interface PRCardProps {
  pr: PullRequest
}

/**
 * Format date to human-readable string
 * Shows relative time for recent PRs (within 7 days), absolute date otherwise
 */
function formatMergedDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 7) {
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * PRCard - Displays a pull request with key metrics and GitHub link
 *
 * Shows:
 * - PR title
 * - Repository name
 * - Merged date (relative for recent PRs)
 * - Additions/deletions stats with color coding
 * - Commits count
 * - Link to GitHub PR
 */
export function PRCard({ pr }: PRCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{pr.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {pr.repo_full_name}
          </Badge>
          <span>•</span>
          <span>{formatMergedDate(pr.merged_at)}</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Additions - Green */}
          <Badge
            variant="default"
            className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          >
            +{pr.additions}
          </Badge>

          {/* Deletions - Red */}
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          >
            -{pr.deletions}
          </Badge>

          {/* Commits - Outline */}
          <Badge variant="outline" className="font-normal">
            {pr.commits_count} {pr.commits_count === 1 ? 'commit' : 'commits'}
          </Badge>
        </div>
      </CardContent>

      <CardFooter>
        <a
          href={pr.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium hover:bg-muted hover:text-foreground transition-colors gap-2 px-2.5 h-7"
        >
          View on GitHub
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  )
}
