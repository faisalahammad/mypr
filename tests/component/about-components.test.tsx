import { render, screen } from '@testing-library/react'

import { ProfileHero } from '@/components/about/ProfileHero'
import { WorkHistory } from '@/components/about/WorkHistory'
import { ContributionGrid } from '@/components/about/ContributionGrid'
import { WordCampSection } from '@/components/about/WordCampSection'

jest.mock('@/components/about/LiveContributions', () => ({
  LiveContributions: () => <div data-testid="live-contributions">Live contributions</div>,
}))

describe('About page components', () => {
  it('renders the profile hero with portrait, title, and social links', () => {
    render(<ProfileHero />)

    expect(screen.getByRole('heading', { level: 1, name: 'Faisal Ahammad' })).toBeInTheDocument()
    expect(screen.getByText('Customer Support Engineer & Open Source Contributor')).toBeInTheDocument()
    expect(screen.getByText('Dhaka, Bangladesh')).toBeInTheDocument()
    expect(screen.getByAltText('Faisal Ahammad')).toHaveAttribute('src', '/faisal-ahammad.jpg')
    expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute(
      'href',
      'mailto:faisalahammad24@gmail.com'
    )

    const githubLink = screen.getByRole('link', { name: /github/i })
    expect(githubLink).toHaveAttribute('href', 'https://github.com/faisalahammad')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText(/Yoast Care Fund in 2025/)).toBeInTheDocument()
    expect(screen.getByText(/Tier 3 support specialist/)).toBeInTheDocument()
  })

  it('renders the work history timeline entries', () => {
    render(<WorkHistory />)

    expect(screen.getByRole('heading', { level: 2, name: 'Work History' })).toBeInTheDocument()
    expect(screen.getByText('Saturday Drive Inc. — Ninja Forms')).toBeInTheDocument()
    expect(screen.getByText('Customer Success Agent')).toBeInTheDocument()
    expect(screen.getByText('Cleveland, Tennessee (Remote)')).toBeInTheDocument()
    expect(screen.getByText('OnTheGoSystems — WPML')).toBeInTheDocument()
    expect(screen.getByText('Elegant Themes — Divi')).toBeInTheDocument()
    expect(screen.getByText('SiteCare LLC')).toBeInTheDocument()
    expect(screen.getByText(/Handled more than 550 customer support tickets per month/)).toBeInTheDocument()
  })

  it('renders contribution summary and plugin contribution cards', () => {
    render(<ContributionGrid />)

    expect(screen.getByRole('heading', { level: 2, name: 'Open Source Contributions' })).toBeInTheDocument()
    expect(screen.getByText(/Contributions to WordPress Core and widely-used plugins/)).toBeInTheDocument()
    expect(
      screen.getByText(/Contributed to versions 6.3 \(Lionel\), 6.5 \(Misha\), 6.7 \(Rose\), 6.8 \(Pablo\), and 6.9/)
    ).toBeInTheDocument()
    expect(screen.getByTestId('live-contributions')).toBeInTheDocument()
  })

  it('renders the community and speaking entries', () => {
    render(<WordCampSection />)

    expect(screen.getByRole('heading', { level: 2, name: 'Community & Speaking' })).toBeInTheDocument()
    expect(screen.getByText('WordCamp Johor Bahru 2025 — Speaker')).toBeInTheDocument()
    expect(screen.getByText(/WordPress Polyglot — General Translation Editor, Bengali/)).toBeInTheDocument()
    expect(screen.getByText('Gravity Forms Community Forums — Volunteer')).toBeInTheDocument()
    expect(screen.getByText('Yoast Care Fund — 2025 Recipient')).toBeInTheDocument()
  })
})
