type RepoIdentity = {
  user_id: string
  repo_full_name: string
}

export function buildActiveRepoLookup(repos: RepoIdentity[]) {
  const lookup = new Map<string, Set<string>>()

  for (const repo of repos) {
    const current = lookup.get(repo.user_id) ?? new Set<string>()
    current.add(repo.repo_full_name)
    lookup.set(repo.user_id, current)
  }

  return lookup
}

export function filterPRsByActiveRepos<T extends RepoIdentity>(
  prs: T[],
  activeRepoLookup: Map<string, Set<string>>
) {
  return prs.filter((pr) => activeRepoLookup.get(pr.user_id)?.has(pr.repo_full_name))
}

export function filterReposByActiveLookup<T extends RepoIdentity>(
  repos: T[],
  activeRepoLookup: Map<string, Set<string>>
) {
  return repos.filter((repo) => activeRepoLookup.get(repo.user_id)?.has(repo.repo_full_name))
}
