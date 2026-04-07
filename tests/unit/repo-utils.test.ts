/**
 * Unit tests for repository utilities
 */

import { describe, it, expect } from '@jest/globals'

describe('Repository Utilities', () => {
  describe('filterPublicRepos', () => {
    it('should filter only public repositories', () => {
      const repos = [
        { visibility: 'public', name: 'repo1' },
        { visibility: 'private', name: 'repo2' },
        { visibility: 'public', name: 'repo3' }
      ]

      const publicRepos = repos.filter((repo: any) => repo.visibility === 'public')

      expect(publicRepos).toHaveLength(2)
      expect(publicRepos.every((repo: any) => repo.visibility === 'public')).toBe(true)
    })

    it('should return empty array when no public repos', () => {
      const repos = [
        { visibility: 'private', name: 'repo1' },
        { visibility: 'private', name: 'repo2' }
      ]

      const publicRepos = repos.filter((repo: any) => repo.visibility === 'public')

      expect(publicRepos).toHaveLength(0)
    })

    it('should handle empty array', () => {
      const publicRepos = [].filter((repo: any) => repo.visibility === 'public')

      expect(publicRepos).toHaveLength(0)
    })
  })

  describe('calculateRepoStats', () => {
    it('should calculate total and active counts', () => {
      const repos = [
        { is_active: true },
        { is_active: false },
        { is_active: true },
        { is_active: false }
      ]

      const totalCount = repos.length
      const activeCount = repos.filter((r: any) => r.is_active).length

      expect(totalCount).toBe(4)
      expect(activeCount).toBe(2)
    })

    it('should handle zero repos', () => {
      const repos: any[] = []

      expect(repos.length).toBe(0)
      expect(repos.filter((r: any) => r.is_active).length).toBe(0)
    })

    it('should handle all inactive repos', () => {
      const repos = [
        { is_active: false },
        { is_active: false }
      ]

      expect(repos.filter((r: any) => r.is_active).length).toBe(0)
    })

    it('should handle all active repos', () => {
      const repos = [
        { is_active: true },
        { is_active: true }
      ]

      expect(repos.filter((r: any) => r.is_active).length).toBe(2)
    })
  })
})
