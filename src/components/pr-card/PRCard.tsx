'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, ExternalLink } from 'lucide-react'
import { downloadAsImage } from '@/lib/utils'
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
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const filename = `pr-${pr.repo_full_name.replace('/', '-')}-${pr.pr_number}.png`
      await downloadAsImage(cardRef.current, filename)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div ref={cardRef}>
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{pr.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {pr.repo_full_name}
          </Badge>
          {pr.source === 'suggested' && (
            <Badge variant="outline" className="font-normal border-primary/30 text-primary">
              Suggested
            </Badge>
          )}
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

      <CardFooter className="flex items-center justify-between">
        <a
          href={pr.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium hover:bg-muted hover:text-foreground transition-colors gap-2 px-2.5 h-7"
        >
          View on GitHub
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={handleDownload}
          disabled={downloading}
          aria-label="Download PR card as image"
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium hover:bg-muted hover:text-foreground transition-colors gap-2 px-2.5 h-7 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </CardFooter>
    </Card>
    </div>
  )
}
