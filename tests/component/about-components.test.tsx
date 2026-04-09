import { render, screen } from '@testing-library/react'

import { ProfileHero } from '@/components/about/ProfileHero'
import { WorkHistory } from '@/components/about/WorkHistory'
import { ContributionGrid } from '@/components/about/ContributionGrid'
import { WordCampSection } from '@/components/about/WordCampSection'

describe('About page components', () => {
  it('renders the profile hero with portrait, title, and social links', () => {
    render(<ProfileHero />)

    expect(screen.getByRole('heading', { level: 1, name: 'Faisal Ahammad' })).toBeInTheDocument()
    expect(screen.getByText('WordPress Engineer & Open Source Contributor')).toBeInTheDocument()
    expect(screen.getByText('Dhaka, Bangladesh')).toBeInTheDocument()
    expect(screen.getByAltText('Faisal Ahammad')).toHaveAttribute('src', '/faisal-ahammad.jpg')

    const githubLink = screen.getByRole('link', { name: /github/i })
    expect(githubLink).toHaveAttribute('href', 'https://github.com/faisalahammad')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the work history timeline entries', () => {
    render(<WorkHistory />)

    expect(screen.getByRole('heading', { level: 2, name: 'Work History' })).toBeInTheDocument()
    expect(screen.getByText('SiteCare')).toBeInTheDocument()
    expect(screen.getByText('Saturday Drive — Ninja Forms')).toBeInTheDocument()
    expect(screen.getByText('OnTheGoSystems — WPML')).toBeInTheDocument()
    expect(screen.getByText('Elegant Themes — Divi')).toBeInTheDocument()
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('renders contribution summary and plugin contribution cards', () => {
    render(<ContributionGrid />)

    expect(screen.getByRole('heading', { level: 2, name: 'Open Source Contributions' })).toBeInTheDocument()
    expect(screen.getByText(/Contributions to WordPress Core and widely-used plugins/)).toBeInTheDocument()
    expect(screen.getByText(/Contributed across versions 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, and 6.9/)).toBeInTheDocument()
    expect(screen.getByText('MC4WP — Mailchimp for WordPress')).toBeInTheDocument()
    expect(screen.getByText('8 PRs')).toBeInTheDocument()
    expect(screen.getByText('Total: 14 merged pull requests across 5 plugins.')).toBeInTheDocument()
  })

  it('renders the community and speaking entries', () => {
    render(<WordCampSection />)

    expect(screen.getByRole('heading', { level: 2, name: 'Community & Speaking' })).toBeInTheDocument()
    expect(screen.getByText('WordCamp Johor Bahru 2025 — Speaker')).toBeInTheDocument()
    expect(screen.getByText('Talk: "The Heart of Customer Support"')).toBeInTheDocument()
    expect(screen.getByText('WordPress Polyglot — General Translation Editor, Bengali')).toBeInTheDocument()
    expect(screen.getByText('WordPress.org Support Forums — Volunteer')).toBeInTheDocument()
  })
})
