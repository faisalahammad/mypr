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

/** Repo rows in display order, with whether each is shown on the profile */
function getRepoRows() {
  const list = screen.getByRole('list', { name: 'Repositories' })
  return Array.from(list.querySelectorAll('li')).map((row) => ({
    name: row.querySelector('p')?.textContent,
    shown: row.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'true',
  }))
}

function expectEnabledCount(text: string) {
  expect(screen.getByText(text, { selector: 'p' })).toBeInTheDocument()
}

function getSummaryCardValue(label: string) {
  const cardLabel = screen.getByText(label, { selector: 'p' })
  const card = cardLabel.closest('div')

  if (!card) {
    throw new Error(`Unable to find summary card for ${label}`)
  }

  const value = card.querySelectorAll('p')[1]

  if (!value) {
    throw new Error(`Unable to find summary value for ${label}`)
  }

  return value.textContent
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

    expect(await screen.findByText('faisal/mypr')).toBeInTheDocument()
    expect(screen.getByText('faisal/private-repo')).toBeInTheDocument()
    expect((await screen.findAllByText('Portfolio sync app')).length).toBeGreaterThan(0)
  })

  it('shows the master visibility switch with enabled count text', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('faisal/mypr')
    expectEnabledCount('1 of 2 enabled')
    expect(screen.getByRole('switch', { name: /toggle all repositories/i })).toBeInTheDocument()
  })

  it('shows public-only summary counts in the top cards', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('faisal/mypr')

    expect(screen.getByText('Visible PRs')).toBeInTheDocument()
    expect(screen.getByText('Lifetime PRs')).toBeInTheDocument()
    expect(getSummaryCardValue('Visible PRs')).toBe('8')
    expect(getSummaryCardValue('Lifetime PRs')).toBe('10')
    expect(getSummaryCardValue('Active repos')).toBe('1')
  })

  it('renders one list sorted alphabetically by repo name', async () => {
    mockInitialFetch({
      repos: [
        {
          repo_full_name: 'zeta/beta',
          description: 'Beta repo',
          is_active: true,
          pr_count: 3,
          last_synced_at: '2026-04-08T10:00:00.000Z',
        },
        {
          repo_full_name: 'alpha/alpha',
          description: 'Alpha repo',
          is_active: true,
          pr_count: 4,
          last_synced_at: '2026-04-08T10:00:00.000Z',
        },
        {
          repo_full_name: 'aardvark/zeta',
          description: 'Zeta repo',
          is_active: false,
          pr_count: 1,
          last_synced_at: '2026-04-08T10:00:00.000Z',
        },
        {
          repo_full_name: 'omega/gamma',
          description: 'Gamma repo',
          is_active: false,
          pr_count: 2,
          last_synced_at: '2026-04-08T10:00:00.000Z',
        },
      ],
    })

    render(<SettingsPage />)

    await screen.findByText('alpha/alpha')
    expect(getRepoRows().map((row) => row.name)).toEqual(['alpha/alpha', 'zeta/beta', 'omega/gamma', 'aardvark/zeta'])
  })

  it('shows the setup checklist until a repo is shown on the profile', async () => {
    mockInitialFetch({ repos: mockRepos.map((repo) => ({ ...repo, is_active: false })) })

    render(<SettingsPage />)

    expect(await screen.findByRole('heading', { name: 'Get your profile ready' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose repos' })).toHaveAttribute('href', '#repositories')
  })

  it('hides the setup checklist once synced with a shown repo', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('faisal/mypr')
    expect(screen.queryByRole('heading', { name: 'Get your profile ready' })).not.toBeInTheDocument()
  })

  it('offers a sync button in the empty repository state', async () => {
    mockInitialFetch({ repos: [], syncInfo: { last_synced: null as unknown as string, total_prs: 0 } })

    render(<SettingsPage />)

    expect(await screen.findByText('No repositories discovered yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync my PRs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument()
  })

  it('filters repositories by name', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('faisal/mypr')
    fireEvent.change(screen.getByRole('searchbox', { name: /filter repositories/i }), {
      target: { value: 'private' },
    })

    expect(getRepoRows().map((row) => row.name)).toEqual(['faisal/private-repo'])
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

    await screen.findByText('faisal/mypr')

    fireEvent.change(screen.getByRole('combobox', { name: /date range/i }), {
      target: { value: '6m' },
    })
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

  it('optimistically toggles a repository in place and updates the enabled count', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /show faisal\/private-repo on profile/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expectEnabledCount('2 of 2 enabled')
      expect(getRepoRows()).toEqual([
        { name: 'faisal/mypr', shown: true },
        { name: 'faisal/private-repo', shown: true },
      ])
      expect(getSummaryCardValue('Visible PRs')).toBe('10')
      expect(getSummaryCardValue('Lifetime PRs')).toBe('10')
      expect(getSummaryCardValue('Active repos')).toBe('2')
    })
  })

  it('enables every repository from the master switch', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const masterToggle = await screen.findByRole('switch', { name: /toggle all repositories/i })

    fireEvent.click(masterToggle)

    await waitFor(() => {
      expectEnabledCount('2 of 2 enabled')
      expect(getRepoRows().every((row) => row.shown)).toBe(true)
      expect(getSummaryCardValue('Visible PRs')).toBe('10')
      expect(getSummaryCardValue('Lifetime PRs')).toBe('10')
      expect(getSummaryCardValue('Active repos')).toBe('2')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/repos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ repo_full_name: 'faisal/private-repo', is_active: true }),
      })
    )
  })

  it('disables every repository from the master switch when all are enabled', async () => {
    mockInitialFetch({
      repos: [
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
          is_active: true,
          pr_count: 2,
          last_synced_at: '2026-04-08T10:00:00.000Z',
        },
      ],
    })

    render(<SettingsPage />)

    const masterToggle = await screen.findByRole('switch', { name: /toggle all repositories/i })

    fireEvent.click(masterToggle)

    await waitFor(() => {
      expectEnabledCount('0 of 2 enabled')
      expect(getRepoRows().some((row) => row.shown)).toBe(false)
      expect(getSummaryCardValue('Visible PRs')).toBe('0')
      expect(getSummaryCardValue('Lifetime PRs')).toBe('10')
      expect(getSummaryCardValue('Active repos')).toBe('0')
    })
  })

  it('labels repos as shown or hidden on the profile', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    expect(await screen.findByText(/8 merged PRs · Shown on profile/)).toBeInTheDocument()
    expect(screen.getByText(/2 merged PRs · Hidden from profile/)).toBeInTheDocument()
    expect(screen.queryByText('Public')).not.toBeInTheDocument()
  })

  it('rolls back repository state when a toggle request fails', async () => {
    mockInitialFetch({ toggleOk: false })

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /show faisal\/private-repo on profile/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByText(/failed to update repository/i)).toBeInTheDocument()
    })

    expectEnabledCount('1 of 2 enabled')
    expect(getRepoRows()).toEqual([
      { name: 'faisal/mypr', shown: true },
      { name: 'faisal/private-repo', shown: false },
    ])
  })

  it('rolls back bulk repository state when the master toggle request fails', async () => {
    mockInitialFetch({ toggleOk: false })

    render(<SettingsPage />)

    await screen.findByText('faisal/mypr')
    const masterToggle = await screen.findByRole('switch', { name: /toggle all repositories/i })

    fireEvent.click(masterToggle)

    await waitFor(() => {
      expect(screen.getByText(/failed to update 1 (repository|repositories)/i)).toBeInTheDocument()
    })

    expectEnabledCount('1 of 2 enabled')
    expect(getRepoRows()).toEqual([
      { name: 'faisal/mypr', shown: true },
      { name: 'faisal/private-repo', shown: false },
    ])
  })

  it('supports selecting the 24 month and lifetime options', async () => {
    const user = userEvent.setup()
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('faisal/mypr')

    await user.selectOptions(screen.getByRole('combobox', { name: /date range/i }), '24m')
    expect(screen.getByRole('combobox', { name: /date range/i })).toHaveValue('24m')

    await user.selectOptions(screen.getByRole('combobox', { name: /date range/i }), 'lifetime')
    expect(screen.getByRole('combobox', { name: /date range/i })).toHaveValue('lifetime')
  })
})
