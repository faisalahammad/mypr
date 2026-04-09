const mockRpc = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
  }),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args?: unknown) => mockRpc(fn, args),
  })),
}))

import { getFollowedPRs } from '@/lib/supabase'

describe('public repo visibility for feed queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'follows') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: [{ following_id: 'user-2' }],
              error: null,
            }),
          })),
        }
      }

      if (table === 'pull_requests') {
        return {
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'pr-1',
                    user_id: 'user-2',
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
                    profiles: {
                      github_username: 'alice',
                      github_avatar_url: 'https://example.com/alice.png',
                      display_name: 'Alice',
                    },
                  },
                  {
                    id: 'pr-2',
                    user_id: 'user-2',
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
                    profiles: {
                      github_username: 'alice',
                      github_avatar_url: 'https://example.com/alice.png',
                      display_name: 'Alice',
                    },
                  },
                ],
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'repositories') {
        throw new Error('getFollowedPRs should not query repositories directly')
      }

      throw new Error(`Unexpected table ${table}`)
    })

    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: 'user-2',
          repo_full_name: 'acme/public-repo',
          owner_avatar_url: 'https://example.com/org.png',
        },
      ],
      error: null,
    })

  })

  it('builds followed feed visibility from the public active repo rpc', async () => {
    const prs = await getFollowedPRs('user-1')

    expect(mockRpc).toHaveBeenCalledWith('get_public_active_repositories', {
      target_user_ids: ['user-2'],
    })
    expect(prs).toHaveLength(1)
    expect(prs[0]).toMatchObject({
      repo_full_name: 'acme/public-repo',
      title: 'Visible PR',
    })
  })
})
