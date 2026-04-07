/**
 * Tests for FeedClient component
 *
 * Tests for:
 * - Rendering initial PRs
 * - Load more button functionality
 * - Loading state
 * - Error handling
 * - Empty state
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedClient } from '@/components/feed/FeedClient'
import type { PullRequestWithProfile } from '@/types'

const mockPRs: PullRequestWithProfile[] = [
  {
    id: 'pr-1',
    user_id: 'user-1',
    repo_full_name: 'owner/repo',
    pr_number: 123,
    title: 'Add new feature',
    body_summary: 'This adds a new feature',
    pr_url: 'https://github.com/owner/repo/pull/123',
    merged_at: '2024-01-01T00:00:00Z',
    additions: 100,
    deletions: 50,
    commits_count: 3,
    synced_at: '2024-01-01T00:00:00Z',
    profile: {
      github_username: 'user1',
      github_avatar_url: 'https://avatar.com/1',
      display_name: 'User One',
    },
  },
  {
    id: 'pr-2',
    user_id: 'user-2',
    repo_full_name: 'owner/another-repo',
    pr_number: 456,
    title: 'Fix bug',
    body_summary: 'This fixes a bug',
    pr_url: 'https://github.com/owner/another-repo/pull/456',
    merged_at: '2024-01-02T00:00:00Z',
    additions: 10,
    deletions: 5,
    commits_count: 1,
    synced_at: '2024-01-02T00:00:00Z',
    profile: {
      github_username: 'user2',
      github_avatar_url: 'https://avatar.com/2',
      display_name: 'User Two',
    },
  },
]

// Mock fetch
global.fetch = jest.fn()

describe('FeedClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render initial PRs', () => {
    render(<FeedClient initialPRs={mockPRs} initialHasMore={false} />)

    expect(screen.getByText('Add new feature')).toBeInTheDocument()
    expect(screen.getByText('Fix bug')).toBeInTheDocument()
  })

  it('should render empty state when no PRs', () => {
    render(<FeedClient initialPRs={[]} initialHasMore={false} />)

    expect(
      screen.getByText(/You're not following anyone yet/i)
    ).toBeInTheDocument()
  })

  it('should show Load more button when hasMore is true', () => {
    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    expect(screen.getByText('Load more')).toBeInTheDocument()
  })

  it('should not show Load more button when hasMore is false', () => {
    render(<FeedClient initialPRs={mockPRs} initialHasMore={false} />)

    expect(screen.queryByText('Load more')).not.toBeInTheDocument()
  })

  it('should show loading state when loading more PRs', async () => {
    const user = userEvent.setup()

    // Mock fetch to return a promise that doesn't resolve immediately
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                prs: [],
                hasMore: false,
              }),
            } as Response)
          }, 100)
        })
    )

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  it('should fetch and append more PRs when Load more is clicked', async () => {
    const user = userEvent.setup()

    const morePRs: PullRequestWithProfile[] = [
      {
        id: 'pr-3',
        user_id: 'user-3',
        repo_full_name: 'owner/third-repo',
        pr_number: 789,
        title: 'Add tests',
        body_summary: 'This adds tests',
        pr_url: 'https://github.com/owner/third-repo/pull/789',
        merged_at: '2024-01-03T00:00:00Z',
        additions: 50,
        deletions: 0,
        commits_count: 2,
        synced_at: '2024-01-03T00:00:00Z',
        profile: {
          github_username: 'user3',
          github_avatar_url: 'https://avatar.com/3',
          display_name: 'User Three',
        },
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        prs: morePRs,
        hasMore: false,
      }),
    } as Response)

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.getByText('Add tests')).toBeInTheDocument()
    })

    // Original PRs should still be visible
    expect(screen.getByText('Add new feature')).toBeInTheDocument()
    expect(screen.getByText('Fix bug')).toBeInTheDocument()
  })

  it('should hide Load more button after loading all PRs', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        prs: [],
        hasMore: false,
      }),
    } as Response)

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.queryByText('Load more')).not.toBeInTheDocument()
    })
  })

  it('should show error message on fetch failure', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    } as Response)

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load more PRs/i)).toBeInTheDocument()
    })
  })

  it('should allow retry after error', async () => {
    const user = userEvent.setup()

    // First call fails
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
      } as Response)
      // Second call succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prs: [],
          hasMore: false,
        }),
      } as Response)

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Failed to load more PRs/i)).toBeInTheDocument()
    })

    // Click retry
    const retryButton = screen.getByText('Try again')
    await user.click(retryButton)

    // Error should be cleared (though we can't easily test the success state here)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('should call API with correct offset', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        prs: [],
        hasMore: false,
      }),
    } as Response)

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feed-prs?limit=20&offset=2' // 2 initial PRs
      )
    })
  })

  it('should disable button while loading', async () => {
    const user = userEvent.setup()

    // Mock fetch to hang
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves
        })
    )

    render(<FeedClient initialPRs={mockPRs} initialHasMore={true} />)

    const loadMoreButton = screen.getByText('Load more')
    await user.click(loadMoreButton)

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /loading/i })
      expect(button).toBeDisabled()
    })
  })
})
