import { buildProfileResultsModel } from '@/lib/profile-results'

const profile = {
  id: 'user-1',
  github_username: 'faisalahammad',
  github_avatar_url: 'https://example.com/avatar.png',
  display_name: 'Faisal Ahammad',
}

const prs = [
  {
    id: 'pr-1',
    user_id: 'user-1',
    repo_full_name: 'openai/docs',
    pr_number: 42,
    title: 'Improve caching docs',
    body_summary: null,
    pr_url: 'https://github.com/openai/docs/pull/42',
    merged_at: '2026-04-06T10:00:00.000Z',
    additions: 10,
    deletions: 1,
    commits_count: 1,
    synced_at: '2026-04-06T10:10:00.000Z',
    profile: {
      github_username: 'faisalahammad',
      github_avatar_url: 'https://example.com/avatar.png',
      display_name: 'Faisal Ahammad',
    },
    repo_owner_avatar_url: 'https://example.com/openai.png',
  },
  {
    id: 'pr-2',
    user_id: 'user-1',
    repo_full_name: 'vercel/next.js',
    pr_number: 100,
    title: 'Fix metadata edge case',
    body_summary: null,
    pr_url: 'https://github.com/vercel/next.js/pull/100',
    merged_at: '2026-04-08T08:00:00.000Z',
    additions: 22,
    deletions: 7,
    commits_count: 2,
    synced_at: '2026-04-08T08:15:00.000Z',
    profile: {
      github_username: 'faisalahammad',
      github_avatar_url: 'https://example.com/avatar.png',
      display_name: 'Faisal Ahammad',
    },
    repo_owner_avatar_url: 'https://example.com/vercel.png',
  },
  {
    id: 'pr-3',
    user_id: 'user-1',
    repo_full_name: 'vercel/next.js',
    pr_number: 101,
    title: 'Polish route transitions',
    body_summary: null,
    pr_url: 'https://github.com/vercel/next.js/pull/101',
    merged_at: '2026-04-07T08:00:00.000Z',
    additions: 8,
    deletions: 3,
    commits_count: 1,
    synced_at: '2026-04-07T08:15:00.000Z',
    profile: {
      github_username: 'faisalahammad',
      github_avatar_url: 'https://example.com/avatar.png',
      display_name: 'Faisal Ahammad',
    },
    repo_owner_avatar_url: 'https://example.com/vercel.png',
  },
]

describe('buildProfileResultsModel', () => {
  it('builds counts, repo groups, summary data, and timeline order from active PRs', () => {
    const result = buildProfileResultsModel({
      profile,
      prs,
      contributedRepos: 2,
    })

    expect(result.identity).toEqual({
      avatarUrl: 'https://example.com/avatar.png',
      displayName: 'Faisal Ahammad',
      username: 'faisalahammad',
    })
    expect(result.counts).toEqual({
      mergedPRs: 3,
      repos: 2,
    })

    expect(result.repoGrid.map((repo) => repo.fullName)).toEqual([
      'vercel/next.js',
      'openai/docs',
    ])
    expect(result.repoGrid[0]).toMatchObject({
      name: 'next.js',
      org: 'vercel',
      pullRequestCount: 2,
    })
    expect(result.repoGrid[0].pullRequests.map((pullRequest) => pullRequest.number)).toEqual([100, 101])

    expect(result.summary.topRepositories).toEqual([
      { fullName: 'vercel/next.js', count: 2 },
      { fullName: 'openai/docs', count: 1 },
    ])
    expect(result.timeline.map((entry) => entry.number)).toEqual([100, 101, 42])
  })

  it('creates share variants from the same normalized payload', () => {
    const result = buildProfileResultsModel({
      profile,
      prs,
      contributedRepos: 2,
    })

    expect(result.shareVariants.length).toBeGreaterThanOrEqual(3)
    expect(result.shareVariants.length).toBeLessThanOrEqual(6)
    expect(result.shareVariants.every((variant) => variant.includes('See the work: mypr.pro.bd/faisalahammad'))).toBe(true)
    expect(result.shareVariants.every((variant) => variant.length <= 280)).toBe(true)
    expect(result.shareVariants.some((variant) => variant.includes('vercel/next.js'))).toBe(true)
    expect(result.shareVariants.some((variant) => variant.includes('Fix metadata edge case'))).toBe(true)
  })

  it('adapts share variants for a single-repo profile', () => {
    const singleRepoPRs = prs.filter((pr) => pr.repo_full_name === 'vercel/next.js')
    const result = buildProfileResultsModel({
      profile,
      prs: singleRepoPRs,
      contributedRepos: 1,
    })

    expect(result.shareVariants.every((variant) => variant.length <= 280)).toBe(true)
    expect(result.shareVariants.some((variant) => variant.includes('vercel/next.js'))).toBe(true)
    expect(result.shareVariants.every((variant) => variant.includes('See the work: mypr.pro.bd/faisalahammad'))).toBe(true)
  })

  it('adapts share variants for a single-PR profile', () => {
    const singlePR = [prs[0]]
    const result = buildProfileResultsModel({
      profile,
      prs: singlePR,
      contributedRepos: 1,
    })

    expect(result.shareVariants.every((variant) => variant.length <= 280)).toBe(true)
    expect(result.shareVariants.some((variant) => variant.includes('first PR'))).toBe(true)
    expect(result.shareVariants.some((variant) => variant.includes('Improve caching docs'))).toBe(true)
  })

  it('includes a dominant-repo variant when most PRs are in one repo', () => {
    const dominantPRs = [
      ...prs.filter((pr) => pr.repo_full_name === 'vercel/next.js'),
      prs[0],
    ]
    const result = buildProfileResultsModel({
      profile,
      prs: dominantPRs,
      contributedRepos: 2,
    })

    expect(result.shareVariants.every((variant) => variant.length <= 280)).toBe(true)
    expect(result.shareVariants.some((variant) => variant.includes('goes into vercel/next.js'))).toBe(true)
  })

  it('truncates very long repo names and PR titles gracefully', () => {
    const longPRs = [
      {
        ...prs[0],
        repo_full_name: 'some-very-long-organization-name/some-very-long-repository-name-that-exceeds-limits',
        title: 'This is an extremely long pull request title that describes every single detail about the changes made in this contribution and should definitely be truncated',
      },
    ]
    const result = buildProfileResultsModel({
      profile,
      prs: longPRs as typeof prs,
      contributedRepos: 1,
    })

    expect(result.shareVariants.every((variant) => variant.length <= 280)).toBe(true)
  })
})
