import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PLUGIN_CONTRIBUTIONS = [
  {
    plugin: 'MC4WP — Mailchimp for WordPress',
    mergedPrs: '8 PRs',
    description: 'The most popular Mailchimp integration plugin for WordPress, by ibericode.',
    href: 'https://github.com/ibericode/mc4wp',
    repo: 'github.com/ibericode/mc4wp',
  },
  {
    plugin: 'Ultimate Member',
    mergedPrs: '2 PRs',
    description: 'A leading user profile and membership plugin for WordPress.',
    href: 'https://github.com/ultimatemember/ultimatemember',
    repo: 'github.com/ultimatemember/ultimatemember',
  },
  {
    plugin: 'Pods Framework',
    mergedPrs: '2 PRs',
    description: 'A powerful content type and custom fields framework for WordPress.',
    href: 'https://github.com/pods-framework/pods',
    repo: 'github.com/pods-framework/pods',
  },
  {
    plugin: 'LiteSpeed Cache',
    mergedPrs: '1 PR',
    description: 'The official cache plugin for LiteSpeed web servers, with millions of active installs.',
    href: 'https://github.com/litespeedtech/lscache_wp',
    repo: 'github.com/litespeedtech/lscache_wp',
  },
  {
    plugin: 'Classic Editor',
    mergedPrs: '1 PR',
    description: 'The official WordPress plugin restoring the classic editing experience.',
    href: 'https://github.com/WordPress/classic-editor',
    repo: 'github.com/WordPress/classic-editor',
  },
] as const

export function ContributionGrid() {
  return (
    <section aria-labelledby="contributions-heading" className="space-y-6">
      <div className="space-y-2">
        <h2 id="contributions-heading" className="text-3xl font-bold tracking-tight text-foreground">
          Open Source Contributions
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Contributions to WordPress Core and widely-used plugins, all merged and live in production.
        </p>
      </div>

      <article className="rounded-2xl border border-border/80 bg-card px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-xl font-medium text-foreground">WordPress Core</h3>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              WordPress Core — Contributed across versions 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, and 6.9. Contributions include bug fixes, enhancements, and improvements across the core codebase. WordPress Core powers over 40% of the web.
            </p>
          </div>
          <a
            href="https://core.trac.wordpress.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            core.trac.wordpress.org
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLUGIN_CONTRIBUTIONS.map((contribution) => (
          <Card key={contribution.plugin} className="gap-3 border border-border/80 py-0 ring-0">
            <CardHeader className="px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{contribution.plugin}</CardTitle>
                  <Badge variant="secondary" className="font-mono text-[11px] text-muted-foreground">
                    {contribution.repo}
                  </Badge>
                </div>
                <span className="inline-flex h-6 items-center rounded-full bg-[hsl(152,69%,45%,0.12)] px-2.5 text-xs font-medium text-[hsl(152,69%,32%)]">
                  {contribution.mergedPrs}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <p className="text-sm leading-7 text-muted-foreground">
                {contribution.description}
              </p>
              <a
                href={contribution.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View repository
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm font-medium text-foreground">
        Total: 14 merged pull requests across 5 plugins.
      </p>
    </section>
  )
}
