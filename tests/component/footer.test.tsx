import { render, screen } from '@testing-library/react'

import Footer from '@/components/layout/Footer'

jest.mock('next/link', () => {
  return ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

jest.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('Footer', () => {
  it('renders the About link in the default footer navigation', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })

  it('renders the About link in the landing-page footer navigation', () => {
    render(<Footer isLandingPage />)

    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })
})
