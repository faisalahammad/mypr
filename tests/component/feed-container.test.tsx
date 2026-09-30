import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedContainer } from '@/components/feed/FeedContainer'
import type { FeedPage, FeedPR } from '@/lib/feed'

jest.mock('@/components/feed/PRFeedCard', () => ({
  PRFeedCard: ({ pr }: { pr: FeedPR }) => <div data-testid="pr-card">{pr.id}</div>,
}))

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  callback: ObserverCallback
  private connected = true
  observe = jest.fn(() => {
    this.connected = true
  })
  unobserve = jest.fn()
  disconnect = jest.fn(() => {
    this.connected = false
  })

  constructor(callback: ObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  static reset() {
    MockIntersectionObserver.instances = []
  }

  static triggerIntersecting() {
    for (const instance of MockIntersectionObserver.instances) {
      if (instance.connected) {
        instance.callback([{ isIntersecting: true }])
      }
    }
  }
}

function makeFeedPR(id: string): FeedPR {
  return {
    id,
    pr_number: 1,
    title: `PR ${id}`,
    body_summary: null,
    pr_url: `https://github.com/acme/repo/pull/1`,
    repo_full_name: 'acme/repo',
    merged_at: '2026-09-01T10:00:00.000Z',
    additions: 10,
    deletions: 1,
    commits_count: 2,
    reaction_counts: {
      love: 0,
      thumbsup: 0,
      informative: 0,
      support: 0,
      funny: 0,
    },
    user_reaction: null,
    author: {
      id: 'author-1',
      github_username: 'acme',
      github_avatar_url: null,
      display_name: 'Acme',
    },
  }
}

function makeFeedPage(items: FeedPR[], nextCursor: string | null): FeedPage {
  return {
    items,
    next_cursor: nextCursor,
    generated_at: new Date().toISOString(),
  }
}

describe('FeedContainer', () => {
  const originalIntersectionObserver = global.IntersectionObserver
  const originalFetch = global.fetch

  beforeEach(() => {
    MockIntersectionObserver.reset()
    global.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('renders the initial feed and the end-of-feed message when there is no cursor', () => {
    const feed = makeFeedPage([makeFeedPR('pr-1'), makeFeedPR('pr-2')], null)
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    render(<FeedContainer initialFeed={feed} userId="user-1" />)

    expect(screen.getAllByTestId('pr-card')).toHaveLength(2)
    expect(screen.getByText('You are all caught up.'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the empty state when the feed has no items', () => {
    render(<FeedContainer initialFeed={makeFeedPage([], null)} userId="user-1" />)

    expect(screen.getByText('No pull requests in your feed yet.'))
    expect(screen.queryByTestId('pr-card')).not.toBeInTheDocument()
  })

  it('loads the next page automatically when the sentinel scrolls into view', async () => {
    const feed = makeFeedPage([makeFeedPR('pr-1'), makeFeedPR('pr-2')], 'cursor-1')
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeFeedPage([makeFeedPR('pr-3'), makeFeedPR('pr-4')], null),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<FeedContainer initialFeed={feed} userId="user-1" />)

    await act(async () => {
      MockIntersectionObserver.triggerIntersecting()
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('pr-card')).toHaveLength(4)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/feed?cursor=cursor-1&limit=10',
      { cache: 'no-store' }
    )
    expect(screen.getByText('You are all caught up.'))
  })

  it('does not fetch again after reaching the end of the feed', async () => {
    const feed = makeFeedPage([makeFeedPR('pr-1')], 'cursor-1')
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => makeFeedPage([makeFeedPR('pr-2')], null),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<FeedContainer initialFeed={feed} userId="user-1" />)

    await act(async () => {
      MockIntersectionObserver.triggerIntersecting()
    })

    await waitFor(() => {
      expect(screen.getByText('You are all caught up.'))
    })

    await act(async () => {
      MockIntersectionObserver.triggerIntersecting()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows an error with retry when loading fails', async () => {
    const user = userEvent.setup()
    const feed = makeFeedPage([makeFeedPR('pr-1')], 'cursor-1')
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeFeedPage([makeFeedPR('pr-2')], null),
      })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<FeedContainer initialFeed={feed} userId="user-1" />)

    await act(async () => {
      MockIntersectionObserver.triggerIntersecting()
    })

    expect(await screen.findByText('Failed to load more pull requests.'))

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Try again' }))
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('pr-card')).toHaveLength(2)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
