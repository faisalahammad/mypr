import { ExternalLink } from 'lucide-react'
import { LiveContributions } from './LiveContributions'

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
              WordPress Core — Contributed to versions 6.3 (Lionel), 6.5 (Misha), 6.7 (Rose), 6.8 (Pablo), and 6.9
              (Francisco). Contributions include bug fixes, enhancements, and improvements across the core codebase.
              WordPress Core powers over 40% of the web.
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

      <LiveContributions />
    </section>
  )
}
