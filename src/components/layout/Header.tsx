'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  GitPullRequestArrow,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton'

// For authenticated users — inner page links
type HeaderNavItem = {
  href: string
  label: string
  icon?: typeof LayoutDashboard
}

const APP_NAV: HeaderNavItem[] = [
  { href: '/feed', label: 'Feed', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const LANDING_NAV: HeaderNavItem[] = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#share', label: 'Share' },
]

interface HeaderProps {
  /** Pass the user's GitHub username to show profile link & avatar */
  username?: string | null
  avatarUrl?: string | null
  isLandingPage?: boolean
}

export default function Header({ username, avatarUrl, isLandingPage = false }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navItems = isLandingPage ? LANDING_NAV : APP_NAV

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-14 lg:px-6">

        {/* Logo */}
        <Link href={username ? '/feed' : '/'} className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary transition-opacity group-hover:opacity-80">
            <GitPullRequestArrow className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground hidden sm:block">
            mypr.pro.bd
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            isLandingPage ? (
              <Link
                key={href}
                href={href}
                className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60"
              >
                {label}
              </Link>
            ) : (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {label}
              </Link>
            )
          ))}
          {!isLandingPage && username && (
            <Link
              href={`/${username}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(`/${username}`)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Profile
            </Link>
          )}
        </nav>

        {/* Right side: avatar + sign out */}
        <div className="flex items-center gap-2">
          {!isLandingPage && avatarUrl && username && (
            <Link href={`/${username}`} aria-label="Your profile">
              <img
                src={avatarUrl}
                alt={username}
                className="h-8 w-8 rounded-full border-2 border-border hover:border-primary transition-colors object-cover"
              />
            </Link>
          )}

          {isLandingPage ? (
            <GitHubLoginButton
              size="sm"
              variant="outline"
              className="hidden md:inline-flex"
            >
              Get Started
            </GitHubLoginButton>
          ) : (
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/60 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-4 pb-4 pt-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isLandingPage
                  ? 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  : isActive(href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {!isLandingPage && Icon ? <Icon className="h-4 w-4" /> : null}
              {label}
            </Link>
          ))}
          {!isLandingPage && username && (
            <Link
              href={`/${username}`}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(`/${username}`) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          )}
          {isLandingPage ? (
            <GitHubLoginButton
              variant="outline"
              className="w-full justify-center"
            >
              Get Started
            </GitHubLoginButton>
          ) : (
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  )
}
