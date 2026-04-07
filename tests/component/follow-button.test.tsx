/**
 * Tests for FollowButton component
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowButton } from '@/components/FollowButton'

global.fetch = jest.fn()

describe('FollowButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows "Follow" when not following', () => {
    render(<FollowButton targetUserId="user-1" initialIsFollowing={false} />)
    expect(screen.getByText('Follow')).toBeInTheDocument()
  })

  it('shows "Unfollow" when already following', () => {
    render(<FollowButton targetUserId="user-1" initialIsFollowing={true} />)
    expect(screen.getByText('Unfollow')).toBeInTheDocument()
  })

  it('calls POST /api/follow when clicking Follow', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ following: true }),
    } as Response)

    render(<FollowButton targetUserId="user-1" initialIsFollowing={false} />)
    await user.click(screen.getByText('Follow'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/follow', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('calls DELETE /api/follow when clicking Unfollow', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ following: false }),
    } as Response)

    render(<FollowButton targetUserId="user-1" initialIsFollowing={true} />)
    await user.click(screen.getByText('Unfollow'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/follow', expect.objectContaining({ method: 'DELETE' }))
    })
  })

  it('applies optimistic update immediately (Follow → Unfollow)', async () => {
    const user = userEvent.setup()
    // Never resolves — lets us inspect mid-flight state
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<FollowButton targetUserId="user-1" initialIsFollowing={false} />)
    await user.click(screen.getByText('Follow'))

    await waitFor(() => {
      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })
  })

  it('reverts to Follow state when POST fails', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response)

    render(<FollowButton targetUserId="user-1" initialIsFollowing={false} />)
    await user.click(screen.getByText('Follow'))

    await waitFor(() => {
      expect(screen.getByText('Follow')).toBeInTheDocument()
    })
  })

  it('reverts to Unfollow state when DELETE fails', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response)

    render(<FollowButton targetUserId="user-1" initialIsFollowing={true} />)
    await user.click(screen.getByText('Unfollow'))

    await waitFor(() => {
      expect(screen.getByText('Unfollow')).toBeInTheDocument()
    })
  })

  it('sends correct target_user_id in request body', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ following: true }),
    } as Response)

    render(<FollowButton targetUserId="target-uuid-999" initialIsFollowing={false} />)
    await user.click(screen.getByText('Follow'))

    await waitFor(() => {
      const call = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.target_user_id).toBe('target-uuid-999')
    })
  })

  it('disables the button while loading', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<FollowButton targetUserId="user-1" initialIsFollowing={false} />)
    await user.click(screen.getByText('Follow'))

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
})
