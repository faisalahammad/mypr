import Link from 'next/link'
import { GitPullRequestArrow } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

interface FooterProps {
  /** If true, shows section anchor links for the landing page */
  isLandingPage?: boolean
}

const LANDING_LINKS = [
  { href: '/about', label: 'About' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#share', label: 'Share' },
]

const APP_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Changelog' },
]

export default function Footer({ isLandingPage = false }: FooterProps) {
  const links = isLandingPage ? LANDING_LINKS : APP_LINKS

  return (
    <footer className="border-t border-border bg-muted/30 py-6">
      <AppShell className="flex flex-wrap items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <GitPullRequestArrow className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            MyPR
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center gap-4" aria-label="Footer navigation">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            Built for open source contributors.
          </p>
        </div>
      </AppShell>
    </footer>
  )
}
