import { notFound } from 'next/navigation'
import { createSupabaseServerClient, getUser, getUserProfile, isFollowing } from '@/lib/supabase'
import { DownloadableTimeline } from '@/components/timeline/DownloadableTimeline'
import { FollowButton } from '@/components/FollowButton'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { AppShell } from '@/components/layout/AppShell'
import type { PullRequestWithProfile } from '@/types'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export const dynamic = 'force-dynamic'

async function getProfileByUsername(username: string) {
  const supabase = await createSupabaseServerClient()
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

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const typedProfile = await getProfileByUsername(username)

  if (!typedProfile) {
    notFound()
  }

  const supabase = await createSupabaseServerClient()
  const { data: prs } = await supabase
    .from('pull_requests')
    .select('*')
    .eq('user_id', typedProfile.id)
    .order('merged_at', { ascending: false })

  const typedPRs = (prs || []) as Array<{
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
  }>

  const prsWithProfile: PullRequestWithProfile[] = typedPRs.map((pr) => ({
    ...pr,
    profile: {
      github_username: typedProfile.github_username,
      github_avatar_url: typedProfile.github_avatar_url,
      display_name: typedProfile.display_name,
    },
  }))

  const displayName = typedProfile.display_name || typedProfile.github_username
  const currentUser = await getUser()
  const currentUserProfile = await getUserProfile() as { github_username: string; github_avatar_url: string | null } | null
  const isOwnProfile = currentUser?.id === typedProfile.id
  const viewerIsFollowing = currentUser && !isOwnProfile
    ? await isFollowing(currentUser.id, typedProfile.id)
    : false

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-secondary/30">
      <Header
        username={currentUserProfile?.github_username ?? null}
        avatarUrl={currentUserProfile?.github_avatar_url ?? null}
      />

      <main className="flex-1 py-10">
        <AppShell>
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.8fr]">
            <Card className="h-fit border-white/60 bg-white/80 shadow-lg shadow-primary/5 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-5">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={typedProfile.github_avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {typedProfile.github_username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayName}</h1>
                    <p className="text-muted-foreground">@{typedProfile.github_username}</p>
                  </div>

                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em]">Merged PRs</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{prsWithProfile.length}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em]">Profile status</p>
                      <p className="mt-2 font-medium text-foreground">
                        {isOwnProfile ? 'Your public portfolio' : 'Public contributor profile'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentUser && !isOwnProfile && (
                      <FollowButton
                        targetUserId={typedProfile.id}
                        initialIsFollowing={viewerIsFollowing}
                      />
                    )}

                    <a
                      href={`https://github.com/${typedProfile.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted hover:text-foreground transition-colors gap-2"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <DownloadableTimeline
                prs={prsWithProfile}
                emptyMessage="No pull requests yet. Check back soon!"
              />
            </div>
          </div>
        </AppShell>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return {
      title: 'User Not Found',
    }
  }

  const displayName = profile.display_name || profile.github_username

  return {
    title: `${displayName} (@${profile.github_username}) - PR Portfolio`,
    description: `View ${displayName}'s pull request portfolio on mypr.pro.bd`,
    openGraph: {
      title: `${displayName} - PR Portfolio`,
      description: `View ${displayName}'s pull request portfolio on mypr.pro.bd`,
      images: profile.github_avatar_url ? [profile.github_avatar_url] : [],
    },
  }
}
