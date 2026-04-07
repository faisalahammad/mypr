'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Timeline } from './Timeline'
import { downloadAsImage } from '@/lib/utils'
import type { PullRequestWithProfile } from '@/types'

interface DownloadableTimelineProps {
  prs: PullRequestWithProfile[]
  emptyMessage?: string
}

/**
 * Client wrapper around Timeline that adds a "Download timeline" button.
 * Captures the entire timeline section as a PNG.
 */
export function DownloadableTimeline({ prs, emptyMessage }: DownloadableTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!containerRef.current) return
    setDownloading(true)
    try {
      await downloadAsImage(containerRef.current, 'pr-timeline.png')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      {prs.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download timeline as image"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading…' : 'Download Timeline'}
          </button>
        </div>
      )}
      <div ref={containerRef}>
        <Timeline prs={prs} emptyMessage={emptyMessage} />
      </div>
    </div>
  )
}
