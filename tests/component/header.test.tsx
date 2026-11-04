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
      getSession: () =>
        Promise.resolve({
          data: { session: { user: { user_metadata: { user_name: 'octocat', avatar_url: 'https://example.com/o.png' } } } },
        }),
    },
  }),
}))

describe('Header', () => {
  it('renders the MyPR brand in shared header chrome', () => {
    render(<Header username="faisalahammad" avatarUrl="https://example.com/avatar.png" />)

    expect(screen.getByText('MyPR')).toBeInTheDocument()
  })

  // Default prefetch on the force-dynamic profile route loads only its loading.tsx
  // shell, never page data, so settings changes cannot surface a stale profile.
  it('prefetches the profile loading shell for instant navigation', () => {
    render(<Header username="faisalahammad" avatarUrl="https://example.com/avatar.png" />)

    const profileLinks = screen.getAllByRole('link', { name: /profile/i })
    const profileNavLink = profileLinks.find((link) => link.textContent?.includes('Profile'))
    expect(profileNavLink).toHaveAttribute('href', '/faisalahammad')
    expect(profileNavLink).toHaveAttribute('data-prefetch', 'true')

    const avatarLink = screen.getByRole('link', { name: /your profile/i })
    expect(avatarLink).toHaveAttribute('href', '/faisalahammad')
    expect(avatarLink).toHaveAttribute('data-prefetch', 'true')
  })

  it('reads the signed-in user from the browser session on static pages', async () => {
    render(<Header clientSession />)

    expect(await screen.findByRole('link', { name: /your profile/i })).toHaveAttribute('href', '/octocat')
  })
})
