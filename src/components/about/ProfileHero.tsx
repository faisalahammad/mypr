import { MapPin } from 'lucide-react'

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function WordPressIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0a12 12 0 1 0 12 12A12.014 12.014 0 0 0 12 0Zm10.293 12a10.228 10.228 0 0 1-1.637 5.546l-4.015-11.002a3.84 3.84 0 0 0-.623-1.11A10.264 10.264 0 0 1 22.293 12Zm-10.05-8.24c.783 0 1.495.066 2.181.2-.311.018-.605.032-.854.032-1.388 0-3.539-.17-3.539-.17a.558.558 0 1 0-.088 1.112s.723.084 1.489.126l2.213 6.603-3.108 9.319A10.29 10.29 0 0 1 12.243 3.76ZM3.76 12a10.27 10.27 0 0 1 1.637-5.543l4.164 11.406a3.614 3.614 0 0 0 .847 1.34A10.267 10.267 0 0 1 3.76 12Zm8.346 8.251 2.622-7.616 2.686 7.36a10.285 10.285 0 0 1-5.308.256Z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.983 3.5C4.983 4.881 3.87 6 2.492 6S0 4.881 0 3.5 1.114 1 2.492 1s2.491 1.119 2.491 2.5ZM.25 8h4.484v14H.25V8Zm7.218 0h4.297v1.914h.062c.598-1.133 2.061-2.329 4.244-2.329 4.539 0 5.379 2.989 5.379 6.875V22h-4.484v-6.758c0-1.612-.03-3.684-2.245-3.684-2.248 0-2.592 1.755-2.592 3.569V22H7.468V8Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.901 1.154h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.639 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932Zm-1.291 19.49h2.04L6.486 3.24H4.298L17.61 20.644Z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  {
    href: 'https://github.com/faisalahammad',
    label: 'GitHub',
    icon: <GitHubIcon />,
  },
  {
    href: 'https://linkedin.com/in/faisalahammad',
    label: 'LinkedIn',
    icon: <LinkedInIcon />,
  },
  {
    href: 'https://profiles.wordpress.org/faisalahammad',
    label: 'WordPress.org',
    icon: <WordPressIcon />,
  },
  {
    href: 'https://twitter.com/faisalahammad',
    label: 'Twitter/X',
    icon: <XIcon />,
  },
] as const

export function ProfileHero() {
  return (
    <section aria-labelledby="about-title" className="rounded-2xl border border-border/80 bg-card px-6 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10 md:h-32 md:w-32">
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-medium text-muted-foreground">
            FA
          </div>
          <img
            src="/faisal-ahammad.jpg"
            alt="Faisal Ahammad"
            className="relative h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <h1 id="about-title" className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Faisal Ahammad
            </h1>
            <p className="text-lg font-medium text-foreground">
              WordPress Engineer &amp; Open Source Contributor
            </p>
            <address className="flex items-center gap-2 text-sm not-italic text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>Dhaka, Bangladesh</span>
            </address>
          </div>

          <p className="text-base leading-relaxed text-foreground">
            Over a decade in the WordPress ecosystem — supporting, contributing, building, and connecting.
          </p>

          <p className="max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
            Faisal Ahammad is a WordPress support engineer and open source contributor based in Dhaka, Bangladesh. With over ten years in the WordPress ecosystem, he has held engineering and support roles at some of the most recognised WordPress product companies in the world, including Elegant Themes, OnTheGoSystems, Saturday Drive, and SiteCare. He has contributed code to WordPress Core across multiple versions, merged pull requests into widely-used plugins, organised and spoken at WordCamps, and built and published his own plugins on WordPress.org. He created mypr.pro.bd to give open source contributors a better way to document and share their work.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
