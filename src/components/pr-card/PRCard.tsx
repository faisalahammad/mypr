'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Download, ExternalLink } from 'lucide-react'
import { downloadAsImage } from '@/lib/utils'
import type { PullRequest } from '@/types'

interface PRCardProps {
  pr: PullRequest & { repo_owner_avatar_url?: string | null }
}

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

  const repoOwner = pr.repo_full_name.split('/')[0]

  return (
    <div ref={cardRef}>
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">
            <a
              href={pr.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              {pr.title}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </CardTitle>
          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download PR card as image"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {pr.repo_owner_avatar_url && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={pr.repo_owner_avatar_url} alt={repoOwner} />
              <AvatarFallback className="text-[9px]">{repoOwner.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <Badge variant="secondary" className="font-normal">
            {pr.repo_full_name}
          </Badge>
          {pr.source === 'suggested' && (
            <Badge variant="outline" className="font-normal border-primary/30 text-primary">
              Suggested
            </Badge>
          )}
          <span>·</span>
          <span>{formatMergedDate(pr.merged_at)}</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="default"
            className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          >
            +{pr.additions}
          </Badge>

          <Badge
            variant="destructive"
            className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          >
            -{pr.deletions}
          </Badge>

          <Badge variant="outline" className="font-normal">
            {pr.commits_count} {pr.commits_count === 1 ? 'commit' : 'commits'}
          </Badge>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
