import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import SettingsPage from '@/app/(app)/settings/page'

const mockDownloadAsImage = jest.fn()

jest.mock('@/lib/utils', () => ({
  cn: (...inputs: Array<string | false | null | undefined>) => inputs.filter(Boolean).join(' '),
  downloadAsImage: (...args: unknown[]) => mockDownloadAsImage(...args),
}))

global.fetch = jest.fn()

const mockRepos = [
  {
    repo_full_name: 'faisal/mypr',
    description: 'Portfolio sync app',
    is_active: true,
    pr_count: 8,
    last_synced_at: '2026-04-08T10:00:00.000Z',
  },
  {
    repo_full_name: 'faisal/private-repo',
    description: null,
    is_active: false,
    pr_count: 2,
    last_synced_at: '2026-04-08T10:00:00.000Z',
  },
]

const mockSyncInfo = {
  last_synced: '2026-04-08T10:00:00.000Z',
  total_prs: 10,
}

function mockInitialFetch({
  repos = mockRepos,
  syncInfo = mockSyncInfo,
  reposOk = true,
  toggleOk = true,
  syncOk = true,
}: {
  repos?: typeof mockRepos
  syncInfo?: typeof mockSyncInfo
  reposOk?: boolean
  toggleOk?: boolean
  syncOk?: boolean
} = {}) {
  let currentRepos = repos.map((repo) => ({ ...repo }))

  ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url === '/api/repos' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))

      if (toggleOk) {
        currentRepos = currentRepos.map((repo) =>
          repo.repo_full_name === body.repo_full_name
            ? { ...repo, is_active: body.is_active }
            : repo
        )
      }

      return Promise.resolve({
        ok: toggleOk,
        json: jest.fn().mockResolvedValue(
          toggleOk
            ? {
                success: true,
                repo: {
                  repo_full_name: body.repo_full_name,
                  is_active: body.is_active,
                },
              }
            : {
                success: false,
                message: 'Failed to update repository',
              }
        ),
      })
    }

    if (url === '/api/repos') {
      return Promise.resolve({
        ok: reposOk,
        json: jest.fn().mockResolvedValue(
          reposOk
            ? {
                success: true,
                repos: currentRepos,
                total_count: currentRepos.length,
                active_count: currentRepos.filter((repo) => repo.is_active).length,
              }
            : {
                success: false,
                message: 'Unable to load repositories',
              }
        ),
      })
    }

    if (url === '/api/sync-prs' && init?.method === 'POST') {
      return Promise.resolve({
        ok: syncOk,
        json: jest.fn().mockResolvedValue(
          syncOk
            ? {
                success: true,
                synced: 10,
                repos_found: 2,
                message: 'Synced 10 approved PRs across 2 repos',
              }
            : {
                success: false,
                error: 'Sync failed',
                message: 'Failed to sync PRs',
              }
        ),
      })
    }

    if (url === '/api/sync-prs') {
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(syncInfo),
      })
    }

    throw new Error(`Unexpected fetch request: ${url}`)
  })
}

describe('Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders cached repositories from /api/repos', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    expect(await screen.findByText('mypr')).toBeInTheDocument()
    expect(screen.getByText('private-repo')).toBeInTheDocument()
    expect((await screen.findAllByText('Portfolio sync app')).length).toBeGreaterThan(0)
  })

  it('shows the active and total repository count from fetched repos', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    expect(await screen.findByText('1 active / 2 total')).toBeInTheDocument()
  })

  it('shows an actionable repositories error state when repo loading fails', async () => {
    mockInitialFetch({ reposOk: false })

    render(<SettingsPage />)

    expect((await screen.findAllByText('Unable to load repositories')).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('posts the selected date range during sync', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('mypr')

    fireEvent.click(screen.getByRole('button', { name: /last 3 months/i }))
    fireEvent.click(screen.getByRole('option', { name: /last 6 months/i }))
    fireEvent.click(screen.getByRole('button', { name: /sync prs/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sync-prs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ dateRange: '6m' }),
        })
      )
    })
  })

  it('optimistically toggles a repository and updates the active count', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /toggle repository faisal\/private-repo/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByText('2 active / 2 total')).toBeInTheDocument()
    })
  })

  it('uses public visibility copy instead of hidden-from-profile copy', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    expect((await screen.findAllByText('Visible on profile, timeline, and feed')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Hidden from profile')).not.toBeInTheDocument()
    expect(screen.queryByText('Visible on profile')).not.toBeInTheDocument()
  })

  it('rolls back repository state when a toggle request fails', async () => {
    mockInitialFetch({ toggleOk: false })

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /toggle repository faisal\/private-repo/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByText(/failed to update repository/i)).toBeInTheDocument()
    })

    expect(screen.getByText('1 active / 2 total')).toBeInTheDocument()
  })

  it('closes the date dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('mypr')

    await user.click(screen.getByRole('button', { name: /last 3 months/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByRole('heading', { name: 'Settings' }))

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('supports selecting the 24 month and lifetime options', async () => {
    const user = userEvent.setup()
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('mypr')

    await user.click(screen.getByRole('button', { name: /last 3 months/i }))
    await user.click(screen.getByRole('option', { name: /last 24 months/i }))
    expect(screen.getByRole('button', { name: /last 24 months/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /last 24 months/i }))
    await user.click(screen.getByRole('option', { name: /lifetime/i }))
    expect(screen.getByRole('button', { name: /lifetime/i })).toBeInTheDocument()
  })
})
