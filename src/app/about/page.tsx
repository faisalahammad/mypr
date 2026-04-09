import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { AppShell } from '@/components/layout/AppShell'
import { ContributionGrid } from '@/components/about/ContributionGrid'
import { ProfileHero } from '@/components/about/ProfileHero'
import { WorkHistory } from '@/components/about/WorkHistory'
import { WordCampSection } from '@/components/about/WordCampSection'
import { getUserProfile } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'About Faisal Ahammad — WordPress Engineer & Open Source Contributor',
  description: 'Faisal Ahammad is a WordPress support engineer and open source contributor based in Dhaka, Bangladesh, with over a decade of experience in the WordPress ecosystem. Creator of MyPR.',
  keywords: [
    'Faisal Ahammad',
    'Faisal Ahammad WordPress',
    'Faisal Ahammad developer',
    'Faisal Ahammad Bangladesh',
    'Faisal Ahammad open source',
    'WordPress support engineer Bangladesh',
    'WordPress open source contributor',
    'WordCamp Dhaka',
    'MyPR',
  ],
  openGraph: {
    title: 'Faisal Ahammad — WordPress Engineer & Open Source Contributor',
    description: 'Over a decade in the WordPress ecosystem. Support engineer, open source contributor, polyglot, and community speaker.',
    url: 'https://mypr.pro.bd/about',
    type: 'profile',
  },
  alternates: {
    canonical: 'https://mypr.pro.bd/about',
  },
}

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Faisal Ahammad',
  jobTitle: 'WordPress Support Engineer & Open Source Contributor',
  url: 'https://mypr.pro.bd/about',
  sameAs: [
    'https://github.com/faisalahammad',
    'https://linkedin.com/in/faisalahammad',
    'https://profiles.wordpress.org/faisalahammad',
    'https://twitter.com/faisalahammad',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Dhaka',
    addressCountry: 'Bangladesh',
  },
  description:
    'WordPress support engineer and open source contributor with over a decade of experience in the WordPress ecosystem.',
  knowsAbout: [
    'WordPress',
    'Open Source',
    'Customer Support',
    'PHP',
    'JavaScript',
    'Next.js',
    'Supabase',
  ],
}

interface UserProfile {
  github_username: string
  github_avatar_url: string | null
}

const PUBLISHED_PLUGINS = [
  {
    name: 'Form Finder for Ninja Forms',
    status: 'Published on WordPress.org',
    description:
      'A utility plugin for Ninja Forms that helps site owners find and manage all forms across a WordPress installation.',
    href: 'https://wordpress.org/plugins/form-finder-for-ninja-forms/',
  },
  {
    name: 'Read Only Fields for Gravity Forms',
    status: 'Published on WordPress.org',
    description:
      'Adds read-only field support to Gravity Forms, allowing administrators to display data without allowing user edits.',
    href: 'https://wordpress.org/plugins/read-only-fields-for-gravity-forms/',
  },
] as const

const CURRENT_PROJECTS = [
  {
    name: 'MyPR',
    description:
      'The app you are currently on. A GitHub PR timeline platform for open source contributors. Built with Next.js, Supabase, and Tailwind CSS. MyPR gives contributors a public, shareable timeline of their merged pull requests, a social feed of people they follow, and one-click PNG exports for sharing on LinkedIn and Twitter.',
  },
  {
    name: 'Subscribe Plus for MC4WP',
    qualifier: '(in development)',
    description:
      'A freemium WordPress plugin extending MC4WP — Mailchimp for WordPress — with integrations for membership and event plugins including WishList Member, The Events Calendar, Events Calendar Pro, Event Tickets Plus, and Eventin Pro.',
  },
] as const

export default async function AboutPage() {
  const currentUserProfile = (await getUserProfile()) as UserProfile | null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        username={currentUserProfile?.github_username ?? null}
        avatarUrl={currentUserProfile?.github_avatar_url ?? null}
      />

      <main className="flex-1 py-10">
        <AppShell>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
          />

          <div className="space-y-12">
            <ProfileHero />
            <WorkHistory />
            <ContributionGrid />

            <section aria-labelledby="published-plugins-heading" className="space-y-6">
              <div className="space-y-2">
                <h2 id="published-plugins-heading" className="text-3xl font-bold tracking-tight text-foreground">
                  Published Plugins
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {PUBLISHED_PLUGINS.map((plugin) => (
                  <article key={plugin.name} className="rounded-2xl border border-border/80 bg-card px-6 py-6">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h3 className="text-xl font-medium text-foreground">{plugin.name}</h3>
                        <p className="text-sm text-muted-foreground">{plugin.status}</p>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                        {plugin.description}
                      </p>
                      <a
                        href={plugin.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        View on WordPress.org
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <WordCampSection />

            <section aria-labelledby="current-projects-heading" className="space-y-6">
              <div className="space-y-2">
                <h2 id="current-projects-heading" className="text-3xl font-bold tracking-tight text-foreground">
                  Current Projects
                </h2>
              </div>

              <div className="space-y-4">
                {CURRENT_PROJECTS.map((project) => (
                  <article key={project.name} className="rounded-2xl border border-border/80 bg-card px-6 py-6">
                    <h3 className="text-xl font-medium text-foreground">
                      {project.name}
                      {'qualifier' in project && project.qualifier ? (
                        <span className="ml-2 text-base font-normal text-muted-foreground">{project.qualifier}</span>
                      ) : null}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                      {project.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="get-in-touch-heading" className="rounded-2xl border border-border/80 bg-card px-6 py-8 sm:px-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 id="get-in-touch-heading" className="text-3xl font-bold tracking-tight text-foreground">
                    Get in Touch
                  </h2>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                    Faisal is open to conversations about WordPress, open source, customer support engineering, and anything in between. The best way to reach him is on LinkedIn or GitHub.
                  </p>
                </div>

                <address className="flex flex-col gap-3 not-italic sm:flex-row">
                  <a
                    href="https://linkedin.com/in/faisalahammad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    LinkedIn
                  </a>
                  <a
                    href="https://github.com/faisalahammad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    GitHub
                  </a>
                </address>
              </div>
            </section>
          </div>
        </AppShell>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}
