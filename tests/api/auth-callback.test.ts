jest.mock('@/lib/supabase', () => ({
  createSupabaseRouteHandlerClient: jest.fn(),
  createSupabaseServiceClient: jest.fn(),
}))

jest.mock('@/lib/github', () => ({
  getGitHubFollowing: jest.fn(),
}))

import { GET } from '@/app/api/auth/callback/route'
import {
  createSupabaseRouteHandlerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase'

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(createSupabaseRouteHandlerClient as jest.Mock).mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'user-1',
                user_metadata: {
                  user_name: 'faisal',
                  avatar_url: 'https://avatars.test/faisal',
                  name: 'Faisal',
                },
              },
              provider_token: null,
            },
          },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })

    ;(createSupabaseServiceClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }),
    })
  })

  it('redirects to a safe next path after a successful login', async () => {
    const response = await GET(
      new Request('https://mypr.pro.bd/api/auth/callback?code=test-code&next=%2Ffeed') as any
    )

    expect(response.headers.get('location')).toBe('https://mypr.pro.bd/feed')
  })

  it('falls back to settings when no next path is provided', async () => {
    const response = await GET(
      new Request('https://mypr.pro.bd/api/auth/callback?code=test-code') as any
    )

    expect(response.headers.get('location')).toBe('https://mypr.pro.bd/settings')
  })
})
