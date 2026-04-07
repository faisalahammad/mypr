/**
 * Unit tests for GitHub API helpers
 */

import { getPRSummary } from '@/lib/github'

describe('getPRSummary', () => {
  it('should return empty string for null body', () => {
    expect(getPRSummary(null)).toBe('')
  })

  it('should not truncate short bodies', () => {
    const shortBody = 'This is a short PR description'
    expect(getPRSummary(shortBody)).toBe(shortBody)
  })

  it('should truncate long bodies to 150 characters', () => {
    const longBody = 'a'.repeat(200)
    const summary = getPRSummary(longBody)
    expect(summary.length).toBe(153) // 150 + '...'
    expect(summary.endsWith('...')).toBe(true)
  })

  it('should handle exactly 150 character bodies', () => {
    const exactBody = 'a'.repeat(150)
    const summary = getPRSummary(exactBody)
    expect(summary).toBe(exactBody)
    expect(summary.endsWith('...')).toBe(false)
  })
})

describe('GitHub PR Sorting', () => {
  it('should sort PRs by merged date descending', () => {
    const prs = [
      { merged_at: '2024-01-10T10:00:00Z' } as any,
      { merged_at: '2024-01-15T10:00:00Z' } as any,
      { merged_at: '2024-01-12T10:00:00Z' } as any,
      { merged_at: '2024-01-20T10:00:00Z' } as any
    ]

    const sorted = [...prs].sort((a, b) =>
      new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime()
    )

    expect(sorted[0].merged_at).toBe('2024-01-20T10:00:00Z')
    expect(sorted[1].merged_at).toBe('2024-01-15T10:00:00Z')
    expect(sorted[2].merged_at).toBe('2024-01-12T10:00:00Z')
    expect(sorted[3].merged_at).toBe('2024-01-10T10:00:00Z')
  })

  it('should handle empty array', () => {
    const prs: any[] = []
    const sorted = prs.sort((a, b) =>
      new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime()
    )
    expect(sorted).toEqual([])
  })
})
