import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import {
  createSupabasePublicClient,
  getPublicActiveRepositoriesForUsers,
  getUserProfile,
} from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { AppShell } from '@/components/layout/AppShell'
import type { PullRequestWithProfile } from '@/types'
import { buildActiveRepoLookup, filterPRsByActiveRepos } from '@/lib/repo-visibility'
import {
  buildProfileResultsModel,
  getProfileResultsTag,
  PROFILE_RESULTS_REVALIDATE_SECONDS,
} from '@/lib/profile-results'
import { ProfileResults } from '@/components/profile/ProfileResults'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export const dynamic = 'force-dynamic'

async function getProfileByUsername(username: string) {
  const supabase = createSupabasePublicClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('github_username', username)
    .single()

  if (error || !profile) {
    return null
  }

  return profile as {
    id: string
    github_username: string
    github_avatar_url: string | null
    display_name: string | null
  }
}

async function getPublicProfileResultsData(username: string) {
  const typedProfile = await getProfileByUsername(username)

  if (!typedProfile) {
    return null
  }

  const supabase = createSupabasePublicClient()
  const activeRepoList = await getPublicActiveRepositoriesForUsers(supabase, [typedProfile.id])

  const { data: prs } = await supabase
    .from('pull_requests')
    .select('*')
    .eq('user_id', typedProfile.id)
    .order('merged_at', { ascending: false })

  const repoAvatarLookup = new Map<string, string | null>(
    activeRepoList.map((repo) => [repo.repo_full_name, repo.owner_avatar_url])
  )

  const typedPRs = filterPRsByActiveRepos(
    ((prs || []) as Array<{
      id: string
      user_id: string
      repo_full_name: string
      pr_number: number
      title: string
      body_summary: string | null
      pr_url: string
      merged_at: string
      additions: number
      deletions: number
      commits_count: number
      synced_at: string
    }>),
    buildActiveRepoLookup(activeRepoList.map(({ user_id, repo_full_name }) => ({ user_id, repo_full_name })))
  )

  const prsWithProfile: PullRequestWithProfile[] = typedPRs.map((pr) => ({
    ...pr,
    profile: {
      github_username: typedProfile.github_username,
      github_avatar_url: typedProfile.github_avatar_url,
      display_name: typedProfile.display_name,
    },
    repo_owner_avatar_url: repoAvatarLookup.get(pr.repo_full_name) ?? null,
  }))

  return {
    profile: typedProfile,
    contributedRepos: activeRepoList.length,
    model: buildProfileResultsModel({
      profile: typedProfile,
      prs: prsWithProfile,
      contributedRepos: activeRepoList.length,
    }),
  }
}

async function getCachedPublicProfileResultsData(username: string) {
  return unstable_cache(
    async () => getPublicProfileResultsData(username),
    ['profile-results', username],
    {
      revalidate: PROFILE_RESULTS_REVALIDATE_SECONDS,
      tags: [getProfileResultsTag(username)],
    }
  )()
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const publicProfileResults = await getCachedPublicProfileResultsData(username)

  if (!publicProfileResults) {
    notFound()
  }
  const currentUserProfile = await getUserProfile() as { github_username: string; github_avatar_url: string | null } | null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        username={currentUserProfile?.github_username ?? null}
        avatarUrl={currentUserProfile?.github_avatar_url ?? null}
      />

      <main className="flex-1 py-10">
        <AppShell>
          <ProfileResults model={publicProfileResults.model} />
        </AppShell>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params
  const profileResults = await getCachedPublicProfileResultsData(username)
  const profile = profileResults?.profile

  if (!profile) {
    return {
      title: 'User Not Found',
    }
  }

  const displayName = profile.display_name || profile.github_username

  return {
    title: `${displayName} (@${profile.github_username}) | MyPR`,
    description: `View ${displayName}'s pull request portfolio on MyPR.`,
    openGraph: {
      title: `${displayName} (@${profile.github_username}) | MyPR`,
      description: `View ${displayName}'s pull request portfolio on MyPR.`,
      images: profile.github_avatar_url ? [profile.github_avatar_url] : [],
    },
  }
}
