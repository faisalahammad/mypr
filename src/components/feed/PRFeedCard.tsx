'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FeedPR, ReactionCounts, ReactionType } from '@/lib/feed'
import { ReactionBar } from './ReactionBar'

interface PRFeedCardProps {
  pr: FeedPR
  currentUserId: string
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = date.getTime() - Date.now()
  const diffHours = Math.round(diffMs / 3600000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, 'day')
  }

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, 'month')
  }

  const diffYears = Math.round(diffDays / 365)
  return formatter.format(diffYears, 'year')
}

function getInitials(name: string | null, username: string): string {
  if (name) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')

    if (initials) return initials
  }

  return username.slice(0, 2).toUpperCase()
}

function applyOptimisticReaction(
  reactionCounts: ReactionCounts,
  currentReaction: ReactionType | null,
  nextReaction: ReactionType
): { reactionCounts: ReactionCounts; userReaction: ReactionType | null } {
  const updatedCounts = { ...reactionCounts }

  if (currentReaction === nextReaction) {
    updatedCounts[nextReaction] = Math.max(0, updatedCounts[nextReaction] - 1)
    return { reactionCounts: updatedCounts, userReaction: null }
  }

  if (currentReaction) {
    updatedCounts[currentReaction] = Math.max(0, updatedCounts[currentReaction] - 1)
  }

  updatedCounts[nextReaction] += 1

  return {
    reactionCounts: updatedCounts,
    userReaction: nextReaction,
  }
}

export function PRFeedCard({ pr }: PRFeedCardProps) {
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>(pr.reaction_counts)
  const [userReaction, setUserReaction] = useState<ReactionType | null>(pr.user_reaction)

  const handleReact = async (reactionType: ReactionType) => {
    const previousCounts = reactionCounts
    const previousReaction = userReaction
    const optimisticState = applyOptimisticReaction(reactionCounts, userReaction, reactionType)

    setReactionCounts(optimisticState.reactionCounts)
    setUserReaction(optimisticState.userReaction)

    try {
      const response = await fetch('/api/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pr_id: pr.id,
          reaction_type: reactionType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update reaction')
      }

      const data = (await response.json()) as {
        reaction_counts: ReactionCounts
        reaction_type: ReactionType | null
      }

      setReactionCounts(data.reaction_counts)
      setUserReaction(data.reaction_type)
    } catch {
      setReactionCounts(previousCounts)
      setUserReaction(previousReaction)
    }
  }

  return (
    <article className="mt-3 rounded-2xl border border-border/80 bg-card px-4 py-4 first:mt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {pr.author.github_avatar_url ? (
            <img
              src={pr.author.github_avatar_url}
              alt={pr.author.github_username}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {getInitials(pr.author.display_name, pr.author.github_username)}
            </div>
          )}
          <div className="min-w-0">
            <Link
              href={`/${pr.author.github_username}`}
              className="truncate text-sm font-medium text-foreground hover:underline"
            >
              @{pr.author.github_username}
            </Link>
            <div className="text-xs text-muted-foreground">{formatRelativeTime(pr.merged_at)}</div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80">
          {pr.repo_full_name}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <a
          href={pr.pr_url}
          target="_blank"
          rel="noreferrer"
          className="block text-base font-medium text-foreground hover:underline"
        >
          {pr.title}
        </a>
        {pr.body_summary ? (
          <p className="line-clamp-3 max-w-2xl text-sm text-muted-foreground">
            {pr.body_summary.length > 120 ? `${pr.body_summary.slice(0, 120)}...` : pr.body_summary}
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span className="text-green-600">+{pr.additions}</span>
          <span className="text-red-600">−{pr.deletions}</span>
          <span className="text-foreground/80">·</span>
          <span className="text-foreground">{pr.commits_count} commits</span>
        </p>
      </div>

      <ReactionBar
        prId={pr.id}
        reactionCounts={reactionCounts}
        userReaction={userReaction}
        onReact={handleReact}
      />
    </article>
  )
}
