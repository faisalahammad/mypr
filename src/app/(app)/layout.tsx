import { requireAuth, getUserProfile } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'

interface UserProfile {
  github_username: string
  github_avatar_url: string | null
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireAuth redirects to /login if unauthenticated
  await requireAuth()

  // Fetch profile on the server so Header gets avatar + username without a client-side fetch
  const profile = await getUserProfile() as UserProfile | null

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        username={profile?.github_username ?? null}
        avatarUrl={profile?.github_avatar_url ?? null}
      />

      <main className="flex-1">
        {children}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}
