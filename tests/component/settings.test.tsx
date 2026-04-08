import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import SettingsPage from '@/app/(app)/settings/page'

global.fetch = jest.fn()

const mockRepos = [
  {
    id: 1,
    name: 'mypr',
    full_name: 'faisal/mypr',
    description: 'Portfolio sync app',
    language: 'TypeScript',
    stargazers_count: 12,
    visibility: 'public',
    is_active: true,
  },
  {
    id: 2,
    name: 'private-repo',
    full_name: 'faisal/private-repo',
    description: null,
    language: null,
    stargazers_count: 0,
    visibility: 'private',
    is_active: false,
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
}: {
  repos?: typeof mockRepos
  syncInfo?: typeof mockSyncInfo
  reposOk?: boolean
  toggleOk?: boolean
} = {}) {
  let currentRepos = repos.map((repo) => ({ ...repo }))

  ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url === '/api/repos' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))

      if (toggleOk) {
        currentRepos = currentRepos.map((repo) =>
          repo.full_name === body.repo_full_name
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
                error: 'GitHub fetch failed',
                message: 'Unable to load repositories',
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

  it('renders repository rows from /api/repos and removes the phase 5 placeholder copy', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    expect(await screen.findByText('faisal/mypr')).toBeInTheDocument()
    expect(screen.getByText('faisal/private-repo')).toBeInTheDocument()
    expect(screen.queryByText(/coming soon in phase 5/i)).not.toBeInTheDocument()
  })

  it('shows the active repository count from fetched repos', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    expect(await screen.findByText(/1 active of 2 repositories/i)).toBeInTheDocument()
  })

  it('shows an actionable repositories error state when repo loading fails', async () => {
    mockInitialFetch({ reposOk: false })

    render(<SettingsPage />)

    expect(await screen.findByRole('button', { name: /retry loading repositories/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry loading repositories/i })).toBeInTheDocument()
  })

  it('disables sync when there are no active repositories', async () => {
    mockInitialFetch({
      repos: mockRepos.map((repo) => ({ ...repo, is_active: false })),
    })

    render(<SettingsPage />)

    expect(await screen.findByText(/0 active of 2 repositories/i)).toBeInTheDocument()

    const syncButton = await screen.findByRole('button', { name: /sync prs/i })

    expect(syncButton).toBeDisabled()
    expect(screen.getByText(/activate at least one repository to enable syncing/i)).toBeInTheDocument()
  })

  it('optimistically toggles a repository and updates the active count', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /toggle repository faisal\/private-repo/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByText(/2 active of 2 repositories/i)).toBeInTheDocument()
    })
  })

  it('rolls back repository state when a toggle request fails', async () => {
    mockInitialFetch({ toggleOk: false })

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /toggle repository faisal\/private-repo/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByText(/failed to update repository/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/1 active of 2 repositories/i)).toBeInTheDocument()
  })
})
