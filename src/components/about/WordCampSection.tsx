import { Award, Camera, ExternalLink, Languages, MessageCircle, Mic, Users } from 'lucide-react'

const COMMUNITY_ENTRIES = [
  {
    title: 'WordCamp Johor Bahru 2025 — Speaker',
    subtitleLabel: 'Talk:',
    subtitleText: 'The Heart of Customer Support',
    subtitleHref: 'https://wordpress.tv/2025/07/25/the-heart-of-customer-support/',
    description:
      'Faisal spoke at WordCamp Johor Bahru 2025 on the human side of customer support in the WordPress ecosystem, drawing from over a decade of front-line support experience across multiple WordPress product companies.',
    icon: Mic,
  },
  {
    title: 'WordCamp Dhaka 2025 — Organiser',
    titleHref: 'https://dhaka.wordcamp.org/2025/organizers/',
    subtitleText: 'Role: Accessibility (AX) and Community Development (CD) Team Lead',
    description:
      'Faisal led two organisational teams for WordCamp Dhaka 2025, one of the primary WordPress community events in Bangladesh.',
    icon: Users,
  },
  {
    title: 'Additional WordCamp Involvement',
    description:
      'Faisal has attended 11 WordCamps in total. Other roles include: Volunteer at WordCamp Asia 2025, Volunteer at WordCamp Bangkok 2025, Table Lead at WordCamp Malaysia 2024 (Polyglots), Timekeeper volunteer at WordCamp Malaysia 2024, and Hosting table lead at WordCamp Malaysia 2023.',
    icon: Users,
  },
  {
    title: 'WordPress Polyglot — General Translation Editor, Bengali (#bn_BD)',
    description:
      'As a General Translation Editor for the Bengali locale on translate.wordpress.org, Faisal reviews and approves Bengali translations for WordPress Core, plugins, and themes, helping make WordPress accessible to millions of Bengali-speaking users worldwide.',
    icon: Languages,
  },
  {
    title: 'WordPress Photo Directory — Top 10 Contributor',
    titleHref: 'https://wordpress.org/photos/author/faisalahammad/',
    subtitleText: 'One of the top 10 contributors to the WordPress Photo Directory',
    description:
      'Faisal has contributed 554 photographs to the WordPress Photo Directory (Openverse), making him one of the top 10 contributors globally. These photos are freely licensed and used by WordPress sites around the world.',
    icon: Camera,
  },
  {
    title: 'Gravity Forms Community Forums — Volunteer',
    titleHref: 'https://community.gravityforms.com/u/faisalahammad/summary',
    description:
      'Long-standing volunteer on the Gravity Forms Community Forums, helping users with form design, custom field logic, integrations, and advanced form workflows.',
    icon: MessageCircle,
  },
  {
    title: 'Yoast Care Fund — 2025 Recipient',
    titleHref: 'https://yoast.com/community/care-fund/recipients/faisal-ahammad/',
    description:
      'Faisal was awarded the Yoast Care Fund in 2025 in recognition of his consistent contributions to the WordPress open source community.',
    icon: Award,
  },
] as const

export function WordCampSection() {
  return (
    <section aria-labelledby="community-heading" className="space-y-6">
      <div className="space-y-2">
        <h2 id="community-heading" className="text-3xl font-bold tracking-tight text-foreground">
          Community &amp; Speaking
        </h2>
      </div>

      <div className="space-y-4">
        {COMMUNITY_ENTRIES.map((entry) => {
          const Icon = entry.icon

          return (
            <article
              key={entry.title}
              className="rounded-2xl border border-border/80 bg-card px-6 py-6 shadow-sm shadow-black/5"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">
                    {'titleHref' in entry && entry.titleHref ? (
                      <a
                        href={entry.titleHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                      >
                        {entry.title}
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      entry.title
                    )}
                  </h3>
                  {'subtitleText' in entry && entry.subtitleText ? (
                    <p className="text-sm font-medium text-foreground">
                      {'subtitleLabel' in entry && entry.subtitleLabel ? `${entry.subtitleLabel} ` : null}
                      {'subtitleHref' in entry && entry.subtitleHref ? (
                        <a
                          href={entry.subtitleHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                        >
                          &quot;{entry.subtitleText}&quot;
                          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        entry.subtitleText
                      )}
                    </p>
                  ) : null}
                  <p className="text-sm leading-7 text-muted-foreground sm:text-base">{entry.description}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
