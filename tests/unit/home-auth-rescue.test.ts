jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => url),
}))

jest.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
      }),
    },
  }),
}))

import HomePage from '@/app/page'
import { redirect } from 'next/navigation'

describe('home page oauth rescue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forwards the oauth code and safe next path to the callback route', async () => {
    await HomePage({
      searchParams: Promise.resolve({
        code: 'oauth-code',
        next: '/feed',
      }),
    } as any)

    expect(redirect).toHaveBeenCalledWith('/api/auth/callback?code=oauth-code&next=%2Ffeed')
  })
})
