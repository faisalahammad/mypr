'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing: boolean
}

/**
 * FollowButton - Client component for following/unfollowing a user
 *
 * Shows "Follow" or "Unfollow" based on current state.
 * Uses optimistic UI: updates state immediately, reverts on error.
 */
export function FollowButton({ targetUserId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return

    // Optimistic update
    const previousState = isFollowing
    setIsFollowing(!isFollowing)
    setIsLoading(true)

    try {
      const method = previousState ? 'DELETE' : 'POST'
      const response = await fetch('/api/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })

      if (!response.ok) {
        // Revert on error
        setIsFollowing(previousState)
      }
    } catch {
      // Revert on error
      setIsFollowing(previousState)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isLoading ? 'Updating...' : 'Unfollow'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {isLoading ? 'Updating...' : 'Follow'}
    </button>
  )
}
