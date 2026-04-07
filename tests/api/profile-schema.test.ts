/**
 * Schema validation tests for profile page data fetching
 */

import { z } from 'zod'

// Schema for profile data
const ProfileSchema = z.object({
  id: z.string().uuid(),
  github_username: z.string().min(1),
  github_avatar_url: z.string().url().nullable(),
  github_access_token: z.string().nullable(),
  display_name: z.string().nullable(),
  created_at: z.string()
})

// Schema for PR data
const PullRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  repo_full_name: z.string().min(1),
  pr_number: z.int().positive(),
  title: z.string().min(1),
  body_summary: z.string().nullable(),
  pr_url: z.string().url(),
  merged_at: z.string(),
  additions: z.int().nonnegative(),
  deletions: z.int().nonnegative(),
  commits_count: z.int().nonnegative(),
  synced_at: z.string()
})

// Schema for PR with profile
const PullRequestWithProfileSchema = z.object({
  pr: PullRequestSchema,
  profile: z.object({
    github_username: z.string().min(1),
    github_avatar_url: z.string().url().nullable(),
    display_name: z.string().nullable()
  })
})

describe('Profile page schema validation', () => {
  describe('ProfileSchema', () => {
    const validProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      github_username: 'testuser',
      github_avatar_url: 'https://github.com/testuser.png',
      github_access_token: 'ghp_token',
      display_name: 'Test User',
      created_at: '2024-01-15T10:00:00Z'
    }

    it('should validate a valid profile', () => {
      const result = ProfileSchema.safeParse(validProfile)
      expect(result.success).toBe(true)
    })

    it('should validate profile with null optional fields', () => {
      const profileWithNulls = {
        ...validProfile,
        github_avatar_url: null,
        github_access_token: null,
        display_name: null
      }
      const result = ProfileSchema.safeParse(profileWithNulls)
      expect(result.success).toBe(true)
    })

    it('should reject profile without github_username', () => {
      const invalidProfile = { ...validProfile, github_username: '' }
      const result = ProfileSchema.safeParse(invalidProfile)
      expect(result.success).toBe(false)
    })

    it('should reject profile with invalid UUID', () => {
      const invalidProfile = { ...validProfile, id: 'not-a-uuid' }
      const result = ProfileSchema.safeParse(invalidProfile)
      expect(result.success).toBe(false)
    })

    it('should reject profile with invalid avatar URL', () => {
      const invalidProfile = { ...validProfile, github_avatar_url: 'not-a-url' }
      const result = ProfileSchema.safeParse(invalidProfile)
      expect(result.success).toBe(false)
    })
  })

  describe('PullRequestSchema', () => {
    const validPR = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      repo_full_name: 'owner/repo',
      pr_number: 42,
      title: 'Fix bug',
      body_summary: 'This fixes a bug',
      pr_url: 'https://github.com/owner/repo/pull/42',
      merged_at: '2024-01-15T10:00:00Z',
      additions: 100,
      deletions: 50,
      commits_count: 3,
      synced_at: '2024-01-15T10:00:00Z'
    }

    it('should validate a valid PR', () => {
      const result = PullRequestSchema.safeParse(validPR)
      expect(result.success).toBe(true)
    })

    it('should validate PR with null body_summary', () => {
      const prWithNull = { ...validPR, body_summary: null }
      const result = PullRequestSchema.safeParse(prWithNull)
      expect(result.success).toBe(true)
    })

    it('should reject PR with zero or negative pr_number', () => {
      const invalidPR = { ...validPR, pr_number: 0 }
      const result = PullRequestSchema.safeParse(invalidPR)
      expect(result.success).toBe(false)

      const invalidPR2 = { ...validPR, pr_number: -1 }
      const result2 = PullRequestSchema.safeParse(invalidPR2)
      expect(result2.success).toBe(false)
    })

    it('should reject PR with negative additions', () => {
      const invalidPR = { ...validPR, additions: -10 }
      const result = PullRequestSchema.safeParse(invalidPR)
      expect(result.success).toBe(false)
    })

    it('should reject PR with invalid URL', () => {
      const invalidPR = { ...validPR, pr_url: 'not-a-url' }
      const result = PullRequestSchema.safeParse(invalidPR)
      expect(result.success).toBe(false)
    })
  })

  describe('PullRequestWithProfileSchema', () => {
    const validPRWithProfile = {
      pr: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        repo_full_name: 'owner/repo',
        pr_number: 42,
        title: 'Fix bug',
        body_summary: 'This fixes a bug',
        pr_url: 'https://github.com/owner/repo/pull/42',
        merged_at: '2024-01-15T10:00:00Z',
        additions: 100,
        deletions: 50,
        commits_count: 3,
        synced_at: '2024-01-15T10:00:00Z'
      },
      profile: {
        github_username: 'testuser',
        github_avatar_url: 'https://github.com/testuser.png',
        display_name: 'Test User'
      }
    }

    it('should validate a valid PR with profile', () => {
      const result = PullRequestWithProfileSchema.safeParse(validPRWithProfile)
      expect(result.success).toBe(true)
    })

    it('should validate PR with profile having null avatar_url', () => {
      const prWithNull = {
        ...validPRWithProfile,
        profile: {
          ...validPRWithProfile.profile,
          github_avatar_url: null
        }
      }
      const result = PullRequestWithProfileSchema.safeParse(prWithNull)
      expect(result.success).toBe(true)
    })

    it('should validate PR with profile having null display_name', () => {
      const prWithNull = {
        ...validPRWithProfile,
        profile: {
          ...validPRWithProfile.profile,
          display_name: null
        }
      }
      const result = PullRequestWithProfileSchema.safeParse(prWithNull)
      expect(result.success).toBe(true)
    })

    it('should reject PR with profile missing username', () => {
      const invalid = {
        ...validPRWithProfile,
        profile: {
          ...validPRWithProfile.profile,
          github_username: ''
        }
      }
      const result = PullRequestWithProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('Profile page data structure', () => {
    it('should accept array of PRsWithProfile for Timeline component', () => {
      const data = [
        {
          pr: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            user_id: '123e4567-e89b-12d3-a456-426614174001',
            repo_full_name: 'owner/repo',
            pr_number: 1,
            title: 'First PR',
            body_summary: null,
            pr_url: 'https://github.com/owner/repo/pull/1',
            merged_at: '2024-01-15T10:00:00Z',
            additions: 100,
            deletions: 50,
            commits_count: 3,
            synced_at: '2024-01-15T10:00:00Z'
          },
          profile: {
            github_username: 'testuser',
            github_avatar_url: null,
            display_name: null
          }
        },
        {
          pr: {
            id: '123e4567-e89b-12d3-a456-426614174002',
            user_id: '123e4567-e89b-12d3-a456-426614174001',
            repo_full_name: 'owner/repo',
            pr_number: 2,
            title: 'Second PR',
            body_summary: 'Second PR description',
            pr_url: 'https://github.com/owner/repo/pull/2',
            merged_at: '2024-01-14T10:00:00Z',
            additions: 75,
            deletions: 25,
            commits_count: 1,
            synced_at: '2024-01-14T10:00:00Z'
          },
          profile: {
            github_username: 'testuser',
            github_avatar_url: 'https://github.com/testuser.png',
            display_name: 'Test User'
          }
        }
      ]

      const result = z.array(PullRequestWithProfileSchema).safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should accept empty array for Timeline', () => {
      const result = z.array(PullRequestWithProfileSchema).safeParse([])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
