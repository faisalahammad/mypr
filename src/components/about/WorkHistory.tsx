const WORK_HISTORY = [
  {
    company: 'SiteCare',
    role: 'WordPress Support Engineer',
    period: 'Recent',
    description:
      'SiteCare is a managed WordPress services company. Faisal provided technical support and maintenance for client WordPress installations, handling complex debugging, plugin conflicts, and performance issues.',
  },
  {
    company: 'Saturday Drive — Ninja Forms',
    role: 'WordPress Support Engineer',
    period: 'Prior to SiteCare',
    description:
      'Saturday Drive is the company behind Ninja Forms, one of the most popular form builder plugins on WordPress.org. Faisal handled customer support and technical troubleshooting for Ninja Forms and its ecosystem of add-ons. He also published Form Finder for Ninja Forms on WordPress.org.',
  },
  {
    company: 'OnTheGoSystems — WPML',
    role: 'WordPress Support Engineer',
    period: 'Prior to Saturday Drive',
    description:
      'OnTheGoSystems builds WPML, the leading multilingual plugin for WordPress. Faisal provided deep technical support for multilingual WordPress setups, working with a globally distributed team on complex translation and compatibility challenges.',
  },
  {
    company: 'Elegant Themes — Divi',
    role: 'WordPress Support Engineer',
    period: 'Earlier career',
    description:
      'Elegant Themes is the company behind the Divi builder, one of the most widely used page builders in the WordPress ecosystem. Faisal supported customers across Divi and the broader Elegant Themes product range.',
  },
] as const

export function WorkHistory() {
  return (
    <section aria-labelledby="work-history-heading" className="space-y-6">
      <div className="space-y-2">
        <h2 id="work-history-heading" className="text-3xl font-bold tracking-tight text-foreground">
          Work History
        </h2>
      </div>

      <div className="relative space-y-6 pl-8">
        <div className="absolute bottom-0 left-3 top-0 w-px bg-border" aria-hidden="true" />

        {WORK_HISTORY.map((entry) => (
          <article key={entry.company} className="relative rounded-2xl border border-border/80 bg-card px-5 py-5">
            <div className="absolute left-[-1.55rem] top-6 h-3 w-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-foreground">{entry.company}</h3>
                <p className="text-sm text-muted-foreground">{entry.role}</p>
              </div>
              <time className="shrink-0 text-sm text-muted-foreground">{entry.period}</time>
            </div>

            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              {entry.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
