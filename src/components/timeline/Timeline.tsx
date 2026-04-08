'use client'

import { useEffect, useRef } from 'react'
import { PRCard } from '@/components/pr-card/PRCard'
import type { PullRequestWithProfile } from '@/types'

interface TimelineProps {
  /**
   * Array of PRs to display, ordered reverse-chronologically
   */
  prs: PullRequestWithProfile[]
  /**
   * Message to show when no PRs are available
   */
  emptyMessage?: string
}

/**
 * Timeline - Displays PRs in chronological order with a vertical line connector
 *
 * Features:
 * - Vertical line on the left side
 * - Dot marker at each PR position
 * - Left-aligned cards for easy scanning
 * - Empty state with custom message
 * - Scroll-triggered fade-in animation (respects prefers-reduced-motion)
 */
export function Timeline({ prs, emptyMessage = 'No pull requests yet' }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const cards = container.querySelectorAll('[data-reveal]')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const index = el.dataset.index ?? '0'
            el.style.transitionDelay = `${Number(index) * 80}ms`
            el.classList.remove('opacity-0', 'translate-y-4')
            el.classList.add('opacity-100', 'translate-y-0')
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    cards.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [prs])

  if (prs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-lg text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />

      <div className="space-y-6">
        {prs.map((prWithProfile, index) => (
          <div
            key={prWithProfile.id}
            data-reveal
            data-index={index}
            className="relative pl-12 opacity-0 translate-y-4 transition-all duration-500 ease-out"
          >
            <div
              className="absolute left-[19px] top-6 w-3 h-3 rounded-full bg-primary border-2 border-background"
              aria-hidden="true"
            />

            <PRCard pr={prWithProfile} />
          </div>
        ))}
      </div>
    </div>
  )
}
