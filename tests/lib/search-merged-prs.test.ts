/**
 * searchMergedPRs must skip PRs the caller already has cached, so the daily
 * lifetime cron only fetches details for new PRs instead of every PR ever merged.
 */

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({ request: mockRequest })),
}))

import { getPRKey, searchMergedPRs } from '@/lib/github'

const DETAIL_ROUTE = 'GET /repos/{owner}/{repo}/pulls/{pull_number}'

const searchItem = (repo: string, number: number) => ({
  number,
  title: `PR ${number}`,
  body: null,
  html_url: `https://github.com/${repo}/pull/${number}`,
  pull_request: { merged_at: '2026-10-01T00:00:00Z' },
  repository_url: `https://api.github.com/repos/${repo}`,
  state: 'closed',
  user: { login: 'octocat', avatar_url: '' },
})

beforeEach(() => {
  mockRequest.mockReset()
  mockRequest.mockImplementation(async (route: string) => {
    if (route === 'GET /search/issues') {
      return { data: { items: [searchItem('a/one', 1), searchItem('a/one', 2), searchItem('b/two', 3)] } }
    }
    if (route === DETAIL_ROUTE) {
      return { data: { additions: 1, deletions: 2, commits: 3 } }
    }
    return { data: { description: null, owner: { avatar_url: null } } }
  })
})

const detailCalls = () => mockRequest.mock.calls.filter(([route]) => route === DETAIL_ROUTE)

describe('searchMergedPRs', () => {
  it('fetches every merged PR when nothing is cached', async () => {
    const repos = await searchMergedPRs('token', 'octocat', 'lifetime')

    expect(repos.map((r) => r.repo_full_name).sort()).toEqual(['a/one', 'b/two'])
    expect(detailCalls()).toHaveLength(3)
  })

  it('skips cached PRs and drops repos with nothing new', async () => {
    const cached = new Set([getPRKey('a/one', 1), getPRKey('b/two', 3)])

    const repos = await searchMergedPRs('token', 'octocat', 'lifetime', cached)

    expect(repos).toHaveLength(1)
    expect(repos[0].repo_full_name).toBe('a/one')
    expect(repos[0].prs.map((pr) => pr.pr_number)).toEqual([2])
    expect(detailCalls()).toHaveLength(1)
  })
})
