import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProfileResults } from '@/components/profile/ProfileResults'
import type { ProfileResultsModel } from '@/lib/profile-results'

const mockDownloadAsImage = jest.fn(() => Promise.resolve())

jest.mock('@/lib/utils', () => ({
  cn: (...inputs: Array<string | false | null | undefined>) => inputs.filter(Boolean).join(' '),
  downloadAsImage: (...args: unknown[]) => mockDownloadAsImage(...args),
}))

const mockWriteText = jest.fn(() => Promise.resolve())

Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

const model: ProfileResultsModel = {
  identity: {
    avatarUrl: 'https://example.com/avatar.png',
    displayName: 'Faisal Ahammad',
    username: 'faisalahammad',
  },
  counts: {
    mergedPRs: 4,
    repos: 2,
  },
  repoGrid: [
    {
      fullName: 'vercel/next.js',
      name: 'next.js',
      org: 'vercel',
      pullRequestCount: 4,
      pullRequests: [
        { number: 101, title: 'Polish route transitions', url: 'https://github.com/vercel/next.js/pull/101' },
        { number: 100, title: 'Fix metadata edge case', url: 'https://github.com/vercel/next.js/pull/100' },
        { number: 99, title: 'Tune cache tags', url: 'https://github.com/vercel/next.js/pull/99' },
        { number: 98, title: 'Adjust bundler config', url: 'https://github.com/vercel/next.js/pull/98' },
      ],
    },
    {
      fullName: 'openai/docs',
      name: 'docs',
      org: 'openai',
      pullRequestCount: 1,
      pullRequests: [
        { number: 42, title: 'Improve caching docs', url: 'https://github.com/openai/docs/pull/42' },
      ],
    },
  ],
  summary: {
    mergedPRs: 4,
    repos: 2,
    topRepositories: [
      { fullName: 'vercel/next.js', count: 4 },
      { fullName: 'openai/docs', count: 1 },
    ],
  },
  timeline: [
    {
      id: 'pr-101',
      title: 'Polish route transitions',
      number: 101,
      repoFullName: 'vercel/next.js',
      url: 'https://github.com/vercel/next.js/pull/101',
      mergedAt: '2026-04-08T08:00:00.000Z',
    },
    {
      id: 'pr-42',
      title: 'Improve caching docs',
      number: 42,
      repoFullName: 'openai/docs',
      url: 'https://github.com/openai/docs/pull/42',
      mergedAt: '2026-04-06T10:00:00.000Z',
    },
  ],
  timelineByMonth: [
    {
      key: '2026-04',
      label: 'April 2026',
      entries: [
        {
          id: 'pr-101',
          title: 'Polish route transitions',
          number: 101,
          repoFullName: 'vercel/next.js',
          url: 'https://github.com/vercel/next.js/pull/101',
          mergedAt: '2026-04-08T08:00:00.000Z',
        },
        {
          id: 'pr-42',
          title: 'Improve caching docs',
          number: 42,
          repoFullName: 'openai/docs',
          url: 'https://github.com/openai/docs/pull/42',
          mergedAt: '2026-04-06T10:00:00.000Z',
        },
      ],
    },
  ],
  shareVariants: [
    'A lot of my recent work shipped through open source: 4 merged PRs across 2 repos. See the work: mypr.pro.bd/faisalahammad',
    'From fixes to shipped features, I’ve merged 4 PRs across 2 repos lately. See the work: mypr.pro.bd/faisalahammad',
    'Here’s a snapshot of what I’ve been building in public: 4 merged PRs across 2 repos as @faisalahammad. See the work: mypr.pro.bd/faisalahammad',
  ],
}

describe('ProfileResults', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('renders prototype-style header metadata and defaults to repo grid', () => {
    render(<ProfileResults model={model} />)

    expect(screen.getByText('Faisal Ahammad')).toBeInTheDocument()
    expect(screen.getByText('@faisalahammad · 4 merged PRs · 2 repos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /repo grid/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('next.js')).toBeInTheDocument()
    expect(screen.queryByText('Top Repositories')).not.toBeInTheDocument()
  })

  it('switches views without refetching and updates the preview label', () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /summary stats/i }))

    expect(screen.getByRole('button', { name: /summary stats/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Top Repositories')).toBeInTheDocument()
    expect(screen.getByText('Top repositories snapshot')).toBeInTheDocument()
  })

  it('opens the tweet modal and copies a selected variant', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /tweet this/i }))
    expect(screen.getAllByText(/See the work: mypr.pro.bd\/faisalahammad/i)).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: /copy tweet variant 2/i }))

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(model.shareVariants[1])
    })
  })

  it('shows more contextual tweet copy in the share modal', () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /tweet this/i }))

    expect(screen.getByText(/recent work shipped through open source/i)).toBeInTheDocument()
    expect(screen.getByText(/From fixes to shipped features/i)).toBeInTheDocument()
    expect(screen.getByText(/building in public/i)).toBeInTheDocument()
  })

  it('captures only the preview card when taking a screenshot', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /screenshot/i }))

    await waitFor(() => {
      expect(mockDownloadAsImage).toHaveBeenCalledTimes(1)
    })

    const [element, filename] = mockDownloadAsImage.mock.calls[0]
    expect(element).toBe(screen.getByTestId('preview-card'))
    expect(filename).toBe('faisalahammad-repo-grid.png')
  })

  it('uses constrained capture options for the timeline view', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /timeline/i }))
    fireEvent.click(screen.getByRole('button', { name: /screenshot/i }))

    await waitFor(() => {
      expect(mockDownloadAsImage).toHaveBeenCalledTimes(1)
    })

    const [, , options] = mockDownloadAsImage.mock.calls[0]
    expect(options).toMatchObject({
      maxHeight: 2200,
    })
  })

  it('prefers the fresh server model over stale session storage on route entry', () => {
    window.sessionStorage.setItem(
      'mypr.profile-results:faisalahammad',
      JSON.stringify({
        ...model,
        counts: {
          mergedPRs: 99,
          repos: 9,
        },
      })
    )

    render(<ProfileResults model={model} />)

    expect(screen.getByText('@faisalahammad · 4 merged PRs · 2 repos')).toBeInTheDocument()
    expect(screen.queryByText('@faisalahammad · 99 merged PRs · 9 repos')).not.toBeInTheDocument()
  })

  it('renders the timeline preview with a dedicated rail and marker for each entry', () => {
    const { container } = render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /timeline/i }))

    const items = container.querySelectorAll('[data-testid="profile-timeline-item"]')
    const spine = container.querySelector('[data-testid="profile-timeline-spine"]')
    const markers = container.querySelectorAll('[data-testid="profile-timeline-marker"]')

    expect(items).toHaveLength(model.timeline.length)
    expect(spine).toBeInTheDocument()
    expect(markers).toHaveLength(model.timeline.length)
  })

  it('uses more meaningful preview labels across the three result tabs', () => {
    render(<ProfileResults model={model} />)

    expect(screen.getByText('Repository highlights preview')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /summary stats/i }))
    expect(screen.getByText('Top repositories snapshot')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /timeline/i }))
    expect(screen.getByText('Contribution timeline preview')).toBeInTheDocument()
  })

  it('copies all PR URLs when clicking Copy URLs', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /copy urls/i }))

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        model.timeline.map((t) => t.url).join('\n')
      )
    })
  })

  it('renders a month header with a copy button for each timeline month', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /timeline/i }))

    expect(screen.getByText('April 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /copy pr urls for april 2026/i }))

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        model.timelineByMonth[0].entries.map((entry) => entry.url).join('\n')
      )
    })
  })

  it('copies all PR URLs for a repo from the Summary Stats leaderboard', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /summary stats/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy pr urls for vercel\/next\.js/i }))

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        model.repoGrid[0].pullRequests.map((pr) => pr.url).join('\n')
      )
    })
  })

  it('shows an expand toggle for repos with more than 3 PRs and reveals the rest on click', () => {
    render(<ProfileResults model={model} />)

    expect(screen.queryByText('Tune cache tags')).not.toBeInTheDocument()

    const expandButton = screen.getByRole('button', { name: /show all prs for vercel\/next\.js/i })
    fireEvent.click(expandButton)

    expect(screen.getByText(/Tune cache tags/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show fewer prs for vercel\/next\.js/i })).toBeInTheDocument()
  })

  it('does not show an expand toggle for repos with 3 or fewer PRs', () => {
    render(<ProfileResults model={model} />)

    expect(screen.queryByRole('button', { name: /show all prs for openai\/docs/i })).not.toBeInTheDocument()
  })

  it('renders repo grid PR titles in the "PR #N -  title" format', () => {
    render(<ProfileResults model={model} />)

    expect(screen.getByText(/PR #101/)).toBeInTheDocument()
    expect(screen.getByText(/Polish route transitions/)).toBeInTheDocument()
  })
})
