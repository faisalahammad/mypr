import {
  buildActiveRepoLookup,
  filterPRsByActiveRepos,
  filterReposByActiveLookup,
} from '@/lib/repo-visibility'

describe('repo visibility helpers', () => {
  it('keeps only PRs that belong to active repos for each user', () => {
    const activeLookup = buildActiveRepoLookup([
      { user_id: 'user-1', repo_full_name: 'acme/alpha' },
      { user_id: 'user-2', repo_full_name: 'acme/beta' },
    ])

    const prs = [
      { id: '1', user_id: 'user-1', repo_full_name: 'acme/alpha' },
      { id: '2', user_id: 'user-1', repo_full_name: 'acme/hidden' },
      { id: '3', user_id: 'user-2', repo_full_name: 'acme/beta' },
      { id: '4', user_id: 'user-2', repo_full_name: 'acme/gamma' },
    ]

    expect(filterPRsByActiveRepos(prs, activeLookup)).toEqual([
      { id: '1', user_id: 'user-1', repo_full_name: 'acme/alpha' },
      { id: '3', user_id: 'user-2', repo_full_name: 'acme/beta' },
    ])
  })

  it('keeps only repos that are active for the matching user ids', () => {
    const activeLookup = buildActiveRepoLookup([
      { user_id: 'user-1', repo_full_name: 'acme/alpha' },
    ])

    const repos = [
      { user_id: 'user-1', repo_full_name: 'acme/alpha', pr_count: 3 },
      { user_id: 'user-1', repo_full_name: 'acme/hidden', pr_count: 1 },
      { user_id: 'user-2', repo_full_name: 'acme/alpha', pr_count: 8 },
    ]

    expect(filterReposByActiveLookup(repos, activeLookup)).toEqual([
      { user_id: 'user-1', repo_full_name: 'acme/alpha', pr_count: 3 },
    ])
  })
})
