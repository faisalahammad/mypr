import React from 'react'
import { render } from '@testing-library/react'

const mockProfileResults = jest.fn((_props: unknown) => null)
const mockNotFound = jest.fn()
const mockUnstableCache = jest.fn((fn: () => unknown) => fn)
const mockCreateSupabasePublicClient = jest.fn()
const mockGetUserProfile = jest.fn()
const mockRpc = jest.fn()

jest.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => mockUnstableCache(fn),
}))

jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}))

jest.mock('@/components/layout/Header', () => () => null)
jest.mock('@/components/layout/Footer', () => () => null)
jest.mock('@/components/ui/ScrollToTop', () => () => null)
jest.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@/components/profile/ProfileResults', () => ({
  ProfileResults: (props: unknown) => {
    mockProfileResults(props)
    return null
  },
}))

jest.mock('@/lib/supabase', () => {
  const actual = jest.requireActual('@/lib/supabase')
  return {
    ...actual,
    createSupabasePublicClient: () => mockCreateSupabasePublicClient(),
    createSupabaseServerClient: jest.fn(),
    getUserProfile: () => mockGetUserProfile(),
  }
})

describe('profile page public repo visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserProfile.mockResolvedValue(null)

    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          repo_full_name: 'acme/public-repo',
          owner_avatar_url: 'https://example.com/org.png',
        },
      ],
      error: null,
    })

    const mockFrom = jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'user-1',
                  github_username: 'alice',
                  github_avatar_url: 'https://example.com/alice.png',
                  display_name: 'Alice',
                },
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'pull_requests') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'pr-1',
                    user_id: 'user-1',
                    repo_full_name: 'acme/public-repo',
                    pr_number: 10,
                    title: 'Visible PR',
                    body_summary: null,
                    pr_url: 'https://github.com/acme/public-repo/pull/10',
                    merged_at: '2026-04-08T08:00:00.000Z',
                    additions: 5,
                    deletions: 1,
                    commits_count: 1,
                    synced_at: '2026-04-08T08:05:00.000Z',
                  },
                  {
                    id: 'pr-2',
                    user_id: 'user-1',
                    repo_full_name: 'acme/private-repo',
                    pr_number: 11,
                    title: 'Hidden PR',
                    body_summary: null,
                    pr_url: 'https://github.com/acme/private-repo/pull/11',
                    merged_at: '2026-04-07T08:00:00.000Z',
                    additions: 3,
                    deletions: 1,
                    commits_count: 1,
                    synced_at: '2026-04-07T08:05:00.000Z',
                  },
                ],
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'repositories') {
        throw new Error('profile page should not query repositories directly')
      }

      throw new Error(`Unexpected table ${table}`)
    })

    mockCreateSupabasePublicClient.mockReturnValue({
      from: (table: string) => mockFrom(table),
      rpc: (fn: string, args?: unknown) => mockRpc(fn, args),
    })
  })

  it('builds public profile results from the public active repo rpc', async () => {
    const ProfilePage = (await import('@/app/[username]/page')).default

    const view = await ProfilePage({
      params: Promise.resolve({ username: 'alice' }),
    } as never)
    render(view as React.ReactElement)

    expect(mockProfileResults).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('get_public_active_repositories', {
      target_user_ids: ['user-1'],
    })
    expect(mockProfileResults.mock.calls[0][0]).toMatchObject({
      model: {
        counts: {
          mergedPRs: 1,
          repos: 1,
        },
        repoGrid: [
          expect.objectContaining({
            fullName: 'acme/public-repo',
            pullRequestCount: 1,
          }),
        ],
        timeline: [
          expect.objectContaining({
            repoFullName: 'acme/public-repo',
            title: 'Visible PR',
          }),
        ],
      },
    })
  })
})
