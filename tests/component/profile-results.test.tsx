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
      pullRequestCount: 3,
      pullRequests: [
        { number: 101, title: 'Polish route transitions', url: 'https://github.com/vercel/next.js/pull/101' },
        { number: 100, title: 'Fix metadata edge case', url: 'https://github.com/vercel/next.js/pull/100' },
        { number: 99, title: 'Tune cache tags', url: 'https://github.com/vercel/next.js/pull/99' },
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
      { fullName: 'vercel/next.js', count: 3 },
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
  shareVariants: [
    'I just shipped 4 merged PRs across 2 repos. See the work: mypr.pro.bd/faisalahammad',
    '4 merged PRs. 2 repos. A clean little trail of merged work from @faisalahammad.',
    'PR story for @faisalahammad: 4 merged PRs across 2 active repos.',
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
    expect(screen.getByText('mypr — summary-stats.view')).toBeInTheDocument()
  })

  it('opens the tweet modal and copies a selected variant', async () => {
    render(<ProfileResults model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /tweet this/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy tweet variant 2/i }))

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(model.shareVariants[1])
    })
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
})
