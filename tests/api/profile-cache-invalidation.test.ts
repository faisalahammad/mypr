import { POST as updateRepoVisibility } from '@/app/api/repos/route'

const mockRevalidateTag = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (_body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
    }),
  },
}))

const mockGetSession = jest.fn()
const mockRouteHandlerClient = {
  auth: {
    getSession: (...args: unknown[]) => mockGetSession(...args),
  },
}

const mockUpdateSingle = jest.fn()
const mockProfileMaybeSingle = jest.fn()

const mockServiceClient = {
  from: jest.fn((table: string) => {
    if (table === 'repositories') {
      return {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: (...args: unknown[]) => mockUpdateSingle(...args),
              })),
            })),
          })),
        })),
      }
    }

    if (table === 'profiles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: (...args: unknown[]) => mockProfileMaybeSingle(...args),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table ${table}`)
  }),
}

jest.mock('@/lib/supabase', () => ({
  createSupabaseRouteHandlerClient: () => mockRouteHandlerClient,
  createSupabaseServiceClient: () => mockServiceClient,
}))

describe('profile cache invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
          },
        },
      },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        repo_full_name: 'vercel/next.js',
        is_active: true,
      },
      error: null,
    })
    mockProfileMaybeSingle.mockResolvedValue({
      data: {
        github_username: 'faisalahammad',
      },
    })
  })

  it('revalidates the profile tag and concrete profile path after repo visibility changes', async () => {
    const request = {
      json: async () => ({
        repo_full_name: 'vercel/next.js',
        is_active: true,
      }),
    } as Request

    const response = await updateRepoVisibility(request)

    expect(response.status).toBe(200)
    expect(mockRevalidateTag).toHaveBeenCalledWith('profile-results:faisalahammad', 'max')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/faisalahammad')
  })
})
