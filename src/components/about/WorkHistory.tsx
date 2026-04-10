const WORK_HISTORY = [
  {
    company: 'Saturday Drive Inc. — Ninja Forms',
    role: 'Customer Success Agent',
    startDate: '2024-06',
    startLabel: 'June 2024',
    endDate: '2025-10',
    endLabel: 'October 2025',
    location: 'Cleveland, Tennessee (Remote)',
    summary:
      'Saturday Drive is the company behind Ninja Forms, one of the most popular form builder plugins on WordPress.org with over 800,000 active installs.',
    responsibilities: [
      'Handled more than 550 customer support tickets per month, resolving first-contact issues related to plugin usage and integrations',
      'Filed and organised more than 150 bug reports and feature requests, collaborating with the engineering team to prioritise high-impact items',
      'Created over 35 custom code snippets providing workarounds for plugin limitations, enabling users to resolve technical issues independently',
      'Produced 22+ blog posts and YouTube tutorial videos explaining plugin workflows, increasing user access to self-service resources',
    ],
  },
  {
    company: 'Elegant Themes — Divi',
    role: 'Technical Support Engineer',
    startDate: '2023-04',
    startLabel: 'April 2023',
    endDate: '2024-05',
    endLabel: 'May 2024',
    location: 'San Francisco, California (Remote)',
    summary:
      'Elegant Themes is the company behind the Divi builder, one of the most widely used page builders in the WordPress ecosystem.',
    responsibilities: [
      'Managed approximately 30 customer support cases daily via live chat, addressing design, compatibility, and bug issues',
      'Developed advanced configuration workflows for the Divi Contact Form module, enabling conditional logic and multi-step form flows',
      'Authored technical documentation and custom code examples empowering customers to implement advanced form features independently',
      'Monitored recurring support patterns and flagged frequent issues, providing actionable insights for the product and engineering teams',
    ],
  },
  {
    company: 'OnTheGoSystems — WPML',
    role: 'WordPress Technical Support',
    startDate: '2022-12',
    startLabel: 'December 2022',
    endDate: '2023-03',
    endLabel: 'March 2023',
    location: 'Wanchai, Hong Kong (Remote)',
    summary:
      'OnTheGoSystems builds WPML, the leading multilingual plugin for WordPress used by over 1 million sites.',
    responsibilities: [
      'Handled forum tickets and live chats, responding to 8–10 customer interactions daily regarding WPML and its add-ons',
      'Diagnosed and resolved issues with WPML core features including the Advanced Translation Editor and translation engine, plus compatibility with third-party themes and plugins',
      'Escalated complex technical issues to second-tier support, ensuring timely handoff of critical customer cases',
      'Collaborated with developers to clarify bug reports and define compatibility requirements, contributing to improved product stability',
    ],
  },
  {
    company: 'SiteCare LLC',
    role: 'Client Success Representative',
    startDate: '2022-07',
    startLabel: 'July 2022',
    endDate: '2022-11',
    endLabel: 'November 2022',
    location: 'Atlanta, Georgia (Remote)',
    summary: 'SiteCare provides managed WordPress services to businesses and agencies. Faisal managed 192 client websites.',
    responsibilities: [
      'Managed 192 WordPress websites, handling security, backups, updates, and uptime monitoring',
      'Created staging sites and automated deployments between staging and production environments using Buddy.works',
      'Set up security hardening using Patchstack and automated backups using BlogVault across all client sites',
      'Investigated and remediated hacked websites, resolved security vulnerabilities, and updated outdated themes and plugins',
      'Managed WordPress sites via WP-CLI across multiple hosting environments',
    ],
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
            <div
              className="absolute left-[-1.55rem] top-6 h-3 w-3 rounded-full border-2 border-background bg-primary"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-foreground">{entry.company}</h3>
                <p className="text-sm text-muted-foreground">{entry.role}</p>
                <address className="text-sm not-italic text-muted-foreground">{entry.location}</address>
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">
                <time dateTime={entry.startDate}>{entry.startLabel}</time>
                {' – '}
                <time dateTime={entry.endDate}>{entry.endLabel}</time>
              </p>
            </div>

            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{entry.summary}</p>

            <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground sm:text-base">
              {entry.responsibilities.map((responsibility) => (
                <li key={responsibility} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{responsibility}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
