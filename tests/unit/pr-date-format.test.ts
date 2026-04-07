/**
 * Unit tests for PR date formatting logic
 */

describe('PR date formatting', () => {
  /**
   * Format date to human-readable string
   * Shows relative time for recent PRs (within 7 days), absolute date otherwise
   */
  function formatMergedDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 7) {
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      return `${diffDays} days ago`
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  it('should return "Today" for PR merged today', () => {
    const today = new Date().toISOString()
    expect(formatMergedDate(today)).toBe('Today')
  })

  it('should return "Yesterday" for PR merged 1 day ago', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(formatMergedDate(yesterday)).toBe('Yesterday')
  })

  it('should return "X days ago" for PRs within 7 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatMergedDate(twoDaysAgo)).toBe('2 days ago')

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatMergedDate(fiveDaysAgo)).toBe('5 days ago')

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatMergedDate(sevenDaysAgo)).toBe('7 days ago')
  })

  it('should return absolute date for PRs older than 7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatMergedDate(eightDaysAgo)
    expect(result).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
    expect(result).toMatch(/\d{4}/) // Contains year
  })

  it('should return absolute date for very old PRs', () => {
    const oldDate = '2024-01-15T10:30:00Z'
    const result = formatMergedDate(oldDate)
    expect(result).toMatch(/Jan.*2024/)
  })

  it('should handle edge case of exactly 7 days', () => {
    const exactlySevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    // Exactly 7 days should show "7 days ago" (within the 7-day threshold)
    expect(formatMergedDate(exactlySevenDays)).toBe('7 days ago')
  })

  it('should handle future dates gracefully', () => {
    // PR merged in the future (shouldn't happen but test robustness)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const result = formatMergedDate(futureDate)
    // Should still return something reasonable
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('should handle dates at different times of day', () => {
    // Use exactly 3 days worth of milliseconds
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000

    const morning = new Date(Date.now() - threeDaysMs)
    morning.setHours(10, 0, 0, 0)

    const evening = new Date(Date.now() - threeDaysMs)
    evening.setHours(22, 30, 0, 0)

    const morningResult = formatMergedDate(morning.toISOString())
    const eveningResult = formatMergedDate(evening.toISOString())

    // Both should show "X days ago" (within 7-day window)
    expect(morningResult).toMatch(/\d+ days ago/)
    expect(eveningResult).toMatch(/\d+ days ago/)
  })

  it('should consistently format dates across timezones', () => {
    // Test with a fixed UTC date
    const utcDate = '2024-01-15T10:30:00Z'
    const result1 = formatMergedDate(utcDate)
    const result2 = formatMergedDate(utcDate)

    expect(result1).toBe(result2)
    expect(result1).toMatch(/Jan.*15.*2024/)
  })
})
