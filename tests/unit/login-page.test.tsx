import React from 'react'
import { render, screen } from '@testing-library/react'

const mockUseSearchParams = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

jest.mock('@/components/auth/GitHubLoginButton', () => ({
  GitHubLoginButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

jest.mock('@/lib/auth-redirect', () => ({
  getSafeAuthRedirectPath: jest.fn(() => null),
}))

describe('login page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    })
  })

  it('renders the MyPR brand on the sign-in screen', async () => {
    const LoginPage = (await import('@/app/(auth)/login/page')).default

    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: 'MyPR' })).toBeInTheDocument()
    expect(screen.getByText('Showcase your merged pull requests')).toBeInTheDocument()
  })
})
