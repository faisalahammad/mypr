jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

import { createServerClient } from '@supabase/ssr'
import { middleware } from '../../middleware'

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects unauthenticated users from feed to login with a redirect hint', async () => {
    ;(createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    })

    const request = {
      url: 'https://mypr.pro.bd/feed',
      headers: new Headers(),
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    }

    const response = await middleware(request as any)

    expect(response.headers.get('location')).toBe('https://mypr.pro.bd/login?redirect=%2Ffeed')
  })

  it('redirects authenticated users away from login to their requested member page', async () => {
    ;(createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })

    const request = {
      url: 'https://mypr.pro.bd/login?redirect=%2Fsettings',
      headers: new Headers(),
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    }

    const response = await middleware(request as any)

    expect(response.headers.get('location')).toBe('https://mypr.pro.bd/settings')
  })
})
