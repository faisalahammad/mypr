import { applySupabaseCookies } from '@/lib/supabase-cookie-bridge'

describe('applySupabaseCookies', () => {
  it('writes cookies to both the request and response cookie stores', () => {
    const request = {
      cookies: {
        set: jest.fn(),
      },
    }
    const response = {
      cookies: {
        set: jest.fn(),
      },
    }

    applySupabaseCookies(request as any, response as any, [
      {
        name: 'sb-access-token',
        value: 'token-value',
        options: { path: '/', httpOnly: true },
      },
    ])

    expect(request.cookies.set).toHaveBeenCalledWith('sb-access-token', 'token-value')
    expect(response.cookies.set).toHaveBeenCalledWith('sb-access-token', 'token-value', {
      path: '/',
      httpOnly: true,
    })
  })
})
