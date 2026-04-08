import { render, screen } from '@testing-library/react'

import Header from '@/components/layout/Header'

jest.mock('next/link', () => {
  return ({ children, href, prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} data-prefetch={prefetch === false ? 'false' : 'true'} {...props}>
      {children}
    </a>
  )
})

jest.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('@/lib/supabase-client', () => ({
  createSupabaseClient: () => ({
    auth: {
      signOut: jest.fn(),
    },
  }),
}))

describe('Header', () => {
  it('disables prefetch for profile navigation links', () => {
    render(<Header username="faisalahammad" avatarUrl="https://example.com/avatar.png" />)

    const profileLinks = screen.getAllByRole('link', { name: /profile/i })
    const profileNavLink = profileLinks.find((link) => link.textContent?.includes('Profile'))
    expect(profileNavLink).toHaveAttribute('href', '/faisalahammad')
    expect(profileNavLink).toHaveAttribute('data-prefetch', 'false')

    const avatarLink = screen.getByRole('link', { name: /your profile/i })
    expect(avatarLink).toHaveAttribute('href', '/faisalahammad')
    expect(avatarLink).toHaveAttribute('data-prefetch', 'false')
  })
})
