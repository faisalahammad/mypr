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

function getSectionRepoHeadings(sectionHeading: string) {
  const heading = screen.getByRole('heading', { level: 3, name: sectionHeading })
  const section = heading.closest('section')

  if (!section) {
    throw new Error(`Unable to find section container for ${sectionHeading}`)
  }

  return Array.from(section.querySelectorAll('h4')).map((node) => node.textContent)
}

function expectEnabledCount(text: string) {
  expect(screen.getByText(text, { selector: 'p' })).toBeInTheDocument()
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

  it('shows the master visibility switch with enabled count text', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('mypr')
    expectEnabledCount('1 of 2 enabled')
    expect(screen.getByRole('switch', { name: /toggle all repositories/i })).toBeInTheDocument()
  })

  it('renders active and inactive sections sorted alphabetically by repo name', async () => {
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

    expect(await screen.findByRole('heading', { level: 3, name: 'Active repositories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Inactive repositories' })).toBeInTheDocument()
    expect(getSectionRepoHeadings('Active repositories')).toEqual(['alpha', 'beta'])
    expect(getSectionRepoHeadings('Inactive repositories')).toEqual(['gamma', 'zeta'])
  })

  it('uses stronger styling for repository section headings and repo counts', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const activeHeading = await screen.findByRole('heading', { level: 3, name: 'Active repositories' })
    const activeSection = activeHeading.closest('section')
    const activeCount = activeSection?.querySelector('p')

    expect(activeHeading.className).toContain('text-base')
    expect(activeHeading.className).toContain('text-foreground')
    expect(activeCount?.textContent).toBe('1 repo')
    expect(activeCount?.className).toContain('text-sm')
    expect(activeCount?.className).toContain('text-foreground/80')
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

  it('optimistically toggles a repository, moves it between sections, and updates the enabled count', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /toggle repository faisal\/private-repo/i })

    fireEvent.click(toggle)

    await waitFor(() => {
      expectEnabledCount('2 of 2 enabled')
      expect(getSectionRepoHeadings('Active repositories')).toEqual(['mypr', 'private-repo'])
      expect(screen.queryByRole('heading', { level: 3, name: 'Inactive repositories' })).not.toBeInTheDocument()
    })
  })

  it('enables every repository from the master switch', async () => {
    mockInitialFetch()

    render(<SettingsPage />)

    const masterToggle = await screen.findByRole('switch', { name: /toggle all repositories/i })

    fireEvent.click(masterToggle)

    await waitFor(() => {
      expectEnabledCount('2 of 2 enabled')
      expect(getSectionRepoHeadings('Active repositories')).toEqual(['mypr', 'private-repo'])
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
      expect(getSectionRepoHeadings('Inactive repositories')).toEqual(['mypr', 'private-repo'])
      expect(screen.queryByRole('heading', { level: 3, name: 'Active repositories' })).not.toBeInTheDocument()
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

    expectEnabledCount('1 of 2 enabled')
    expect(getSectionRepoHeadings('Active repositories')).toEqual(['mypr'])
    expect(getSectionRepoHeadings('Inactive repositories')).toEqual(['private-repo'])
  })

  it('rolls back bulk repository state when the master toggle request fails', async () => {
    mockInitialFetch({ toggleOk: false })

    render(<SettingsPage />)

    await screen.findByText('mypr')
    const masterToggle = await screen.findByRole('switch', { name: /toggle all repositories/i })

    fireEvent.click(masterToggle)

    await waitFor(() => {
      expect(screen.getByText(/failed to update 1 (repository|repositories)/i)).toBeInTheDocument()
    })

    expectEnabledCount('1 of 2 enabled')
    expect(getSectionRepoHeadings('Active repositories')).toEqual(['mypr'])
    expect(getSectionRepoHeadings('Inactive repositories')).toEqual(['private-repo'])
  })

  it('supports selecting the 24 month and lifetime options', async () => {
    const user = userEvent.setup()
    mockInitialFetch()

    render(<SettingsPage />)

    await screen.findByText('mypr')

    await user.selectOptions(screen.getByRole('combobox', { name: /date range/i }), '24m')
    expect(screen.getByRole('combobox', { name: /date range/i })).toHaveValue('24m')

    await user.selectOptions(screen.getByRole('combobox', { name: /date range/i }), 'lifetime')
    expect(screen.getByRole('combobox', { name: /date range/i })).toHaveValue('lifetime')
  })
})
