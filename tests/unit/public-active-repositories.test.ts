import { getPublicActiveRepositoriesForUsers } from '@/lib/supabase'

describe('getPublicActiveRepositoriesForUsers', () => {
  it('returns an empty list without calling rpc when no user ids are provided', async () => {
    const rpc = jest.fn()

    const result = await getPublicActiveRepositoriesForUsers({ rpc }, [])

    expect(result).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('normalizes rpc results for the requested users', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          repo_full_name: 'acme/public-repo',
          owner_avatar_url: 'https://example.com/org.png',
        },
      ],
      error: null,
    })

    const result = await getPublicActiveRepositoriesForUsers({ rpc }, ['user-1', 'user-1'])

    expect(rpc).toHaveBeenCalledWith('get_public_active_repositories', {
      target_user_ids: ['user-1'],
    })
    expect(result).toEqual([
      {
        user_id: 'user-1',
        repo_full_name: 'acme/public-repo',
        owner_avatar_url: 'https://example.com/org.png',
      },
    ])
  })
})
