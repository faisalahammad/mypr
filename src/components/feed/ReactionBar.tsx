'use client'

import type { ReactionCounts, ReactionType } from '@/lib/feed'

interface ReactionBarProps {
  prId: string
  reactionCounts: ReactionCounts
  userReaction: ReactionType | null
  onReact: (type: ReactionType) => void
}

const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'thumbsup', emoji: '👍', label: 'Thumbs up' },
  { type: 'informative', emoji: '💡', label: 'Informative' },
  { type: 'support', emoji: '🤝', label: 'Support' },
  { type: 'funny', emoji: '😄', label: 'Funny' },
]

export function ReactionBar({ prId, reactionCounts, userReaction, onReact }: ReactionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-3" aria-label={`Reactions for pull request ${prId}`}>
      {REACTIONS.map((reaction) => {
        const active = userReaction === reaction.type
        const count = reactionCounts[reaction.type]

        return (
          <button
            key={reaction.type}
            type="button"
            onClick={() => onReact(reaction.type)}
            aria-pressed={active}
            className={[
              'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground',
            ].join(' ')}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            {count > 0 ? <span className="tabular-nums">{count}</span> : null}
            <span className="sr-only">{reaction.label}</span>
          </button>
        )
      })}
    </div>
  )
}
