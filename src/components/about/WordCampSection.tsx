import { Languages, Mic, Users } from 'lucide-react'

const COMMUNITY_ENTRIES = [
  {
    title: 'WordCamp Johor Bahru 2025 — Speaker',
    subtitle: 'Talk: "The Heart of Customer Support"',
    description:
      'Faisal spoke at WordCamp Johor Bahru 2025 on the human side of customer support in the WordPress ecosystem, drawing from over a decade of front-line support experience across multiple WordPress product companies.',
    icon: Mic,
  },
  {
    title: 'WordCamp Dhaka 2025 — Organiser',
    subtitle: 'Role: Accessibility (AX) and Community Development (CD) Team Lead',
    description:
      'Faisal led two organisational teams for WordCamp Dhaka 2025, one of the primary WordPress community events in Bangladesh.',
    icon: Users,
  },
  {
    title: 'WordPress Polyglot — General Translation Editor, Bengali',
    description:
      'As a General Translation Editor for the Bengali locale on translate.wordpress.org, Faisal reviews and approves Bengali translations for WordPress Core, plugins, and themes, helping make WordPress accessible to millions of Bengali-speaking users worldwide.',
    icon: Languages,
  },
  {
    title: 'WordPress Photo Directory — Contributor',
    description:
      'Faisal contributes photographs to the official WordPress Photo Directory, which provides free, openly licensed images for the WordPress community.',
    icon: Users,
  },
  {
    title: 'WordPress.org Support Forums — Volunteer',
    description:
      'Long-standing volunteer on the WordPress.org support forums, helping users solve problems across plugins and themes.',
    icon: Users,
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
            <article key={entry.title} className="border-l-2 border-primary/20 pl-5">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-foreground">{entry.title}</h3>
                  {'subtitle' in entry && entry.subtitle ? (
                    <p className="text-sm font-medium text-foreground">{entry.subtitle}</p>
                  ) : null}
                  <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                    {entry.description}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
