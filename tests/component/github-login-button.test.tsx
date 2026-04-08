import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton'

const mockSignInWithOAuth = jest.fn()

jest.mock('@/lib/supabase-client', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}))

describe('GitHubLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('starts GitHub OAuth with the callback route', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    })

    render(<GitHubLoginButton>Login with GitHub</GitHubLoginButton>)

    fireEvent.click(screen.getByRole('button', { name: /login with github/i }))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled()
    })

    const firstCall = mockSignInWithOAuth.mock.calls[0][0]
    expect(firstCall.provider).toBe('github')
    expect(new URL(firstCall.options.redirectTo).pathname).toBe('/api/auth/callback')
    expect(new URL(firstCall.options.redirectTo).search).toBe('')
  })

  it('preserves a safe next path when provided', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    })

    render(<GitHubLoginButton nextPath="/feed">Continue</GitHubLoginButton>)

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled()
    })

    const firstCall = mockSignInWithOAuth.mock.calls[0][0]
    const redirectUrl = new URL(firstCall.options.redirectTo)
    expect(firstCall.provider).toBe('github')
    expect(redirectUrl.pathname).toBe('/api/auth/callback')
    expect(redirectUrl.searchParams.get('next')).toBe('/feed')
  })
})
