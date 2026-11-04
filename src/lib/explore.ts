import { unstable_cache } from 'next/cache'
import { createSupabasePublicClient, getPublicActiveRepositoriesForUsers } from './supabase'

export interface ExploreDeveloper {
  id: string
  github_username: string
  github_avatar_url: string | null
  display_name: string | null
  visible_prs: number
  repos: number
  last_merged_at: string | null
}

const EXPLORE_LIMIT = 24

/** Escapes LIKE wildcards so a search for "a_b" matches literally */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

async function loadDevelopers(query: string): Promise<ExploreDeveloper[]> {
  const supabase = createSupabasePublicClient()
  let profileQuery = supabase
    .from('profiles')
    .select('id, github_username, github_avatar_url, display_name')
    .limit(query ? EXPLORE_LIMIT : 100)

  if (query) {
    profileQuery = profileQuery.ilike('github_username', `%${escapeLike(query)}%`)
  }

  const { data: profiles } = await profileQuery
  const typedProfiles = (profiles ?? []) as Array<Omit<ExploreDeveloper, 'visible_prs' | 'repos' | 'last_merged_at'>>
  if (typedProfiles.length === 0) return []

  const activeRepos = await getPublicActiveRepositoriesForUsers(supabase, typedProfiles.map((p) => p.id))
  const reposByUser = new Map<string, string[]>()
  for (const repo of activeRepos) {
    reposByUser.set(repo.user_id, [...(reposByUser.get(repo.user_id) ?? []), repo.repo_full_name])
  }

  // ponytail: two small queries per developer (count + latest); fine for <=100 profiles, move to an RPC when the user base grows
  const developers = await Promise.all(
    typedProfiles.map(async (profile): Promise<ExploreDeveloper> => {
      const repos = reposByUser.get(profile.id) ?? []
      if (repos.length === 0) {
        return { ...profile, visible_prs: 0, repos: 0, last_merged_at: null }
      }

      const [{ count }, { data: latest }] = await Promise.all([
        supabase
          .from('pull_requests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .in('repo_full_name', repos),
        supabase
          .from('pull_requests')
          .select('merged_at')
          .eq('user_id', profile.id)
          .in('repo_full_name', repos)
          .order('merged_at', { ascending: false })
          .limit(1),
      ])

      return {
        ...profile,
        visible_prs: count ?? 0,
        repos: repos.length,
        last_merged_at: ((latest ?? []) as Array<{ merged_at: string }>)[0]?.merged_at ?? null,
      }
    })
  )

  return developers
    // Browsing hides empty profiles; searching shows every match
    .filter((developer) => query || developer.visible_prs > 0)
    .sort((a, b) => (b.last_merged_at ?? '').localeCompare(a.last_merged_at ?? ''))
    .slice(0, EXPLORE_LIMIT)
}

export function getExploreDevelopers(query: string): Promise<ExploreDeveloper[]> {
  const normalized = query.trim().toLowerCase().slice(0, 39)
  return unstable_cache(() => loadDevelopers(normalized), ['explore-developers', normalized], {
    revalidate: 300,
  })()
}
