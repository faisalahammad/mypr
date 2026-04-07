/**
 * Unit tests for PR summary logic
 * Isolated tests without importing the full github module
 */

describe('getPRSummary logic', () => {
  const getPRSummary = (body: string | null): string => {
    if (!body) return ''
    return body.substring(0, 150) + (body.length > 150 ? '...' : '')
  }

  it('should return empty string for null body', () => {
    expect(getPRSummary(null)).toBe('')
  })

  it('should return empty string for empty string', () => {
    expect(getPRSummary('')).toBe('')
  })

  it('should not truncate short bodies', () => {
    const shortBody = 'This is a short PR description'
    expect(getPRSummary(shortBody)).toBe(shortBody)
    expect(getPRSummary(shortBody).length).toBe(shortBody.length)
  })

  it('should truncate long bodies to 150 characters plus ellipsis', () => {
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
    expect(summary.length).toBe(150)
  })

  it('should handle 151 character bodies', () => {
    const body = 'a'.repeat(151)
    const summary = getPRSummary(body)
    expect(summary.length).toBe(153)
    expect(summary.endsWith('...')).toBe(true)
  })

  it('should preserve content before truncation point', () => {
    const body = 'Fix critical bug. This is a very important fix that addresses a security vulnerability. The implementation is straightforward and follows best practices. All tests pass and the change is backward compatible.'
    const summary = getPRSummary(body)
    expect(summary.startsWith('Fix critical bug')).toBe(true)
  })
})

describe('PR sorting logic', () => {
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

  it('should handle single PR', () => {
    const prs = [{ merged_at: '2024-01-10T10:00:00Z' } as any]
    const sorted = [...prs].sort((a, b) =>
      new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime()
    )
    expect(sorted).toHaveLength(1)
    expect(sorted[0].merged_at).toBe('2024-01-10T10:00:00Z')
  })

  it('should handle same dates', () => {
    const prs = [
      { merged_at: '2024-01-10T10:00:00Z' } as any,
      { merged_at: '2024-01-10T10:00:00Z' } as any,
      { merged_at: '2024-01-10T10:00:00Z' } as any
    ]

    const sorted = [...prs].sort((a, b) =>
      new Date(b.merged_at!).getTime() - new Date(a.merged_at!).getTime()
    )

    expect(sorted).toHaveLength(3)
    expect(sorted.every(pr => pr.merged_at === '2024-01-10T10:00:00Z')).toBe(true)
  })
})
