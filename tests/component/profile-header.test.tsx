/**
 * ProfileHeader: KPIs, top repo chips, follow/owner actions, 1-year activity grid
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ActivityGrid, buildActivityDays, formatActivityDate, getActivityStats } from '@/components/profile/ActivityGrid'
import type { ProfileResultsModel } from '@/lib/profile-results'

jest.mock('@/components/FollowButton', () => ({
  FollowButton: ({ initialIsFollowing }: { initialIsFollowing: boolean }) => (
    <button type="button">{initialIsFollowing ? 'Unfollow' : 'Follow'}</button>
  ),
}))

const today = new Date().toISOString().slice(0, 10)

const model = {
  identity: { avatarUrl: null, displayName: 'Faisal Ahammad', username: 'faisalahammad' },
  counts: { mergedPRs: 214, repos: 6 },
  stats: { linesAdded: 38200, linesRemoved: 12400, lastSyncedAt: null },
  activity: { [today]: [{ number: 1, title: 'One' }] },
  summary: {
    mergedPRs: 214,
    repos: 6,
    topRepositories: [
      { fullName: 'woocommerce/woocommerce', count: 92 },
      { fullName: 'WordPress/gutenberg', count: 41 },
      { fullName: 'a/b', count: 3 },
      { fullName: 'c/d', count: 2 },
      { fullName: 'e/f', count: 1 },
    ],
  },
} as unknown as ProfileResultsModel

describe('ProfileHeader', () => {
  it('shows KPIs, top repos and a GitHub link', () => {
    render(<ProfileHeader model={model} profileId="p1" viewer={null} />)

    expect(screen.getByRole('heading', { name: 'Faisal Ahammad' })).toBeInTheDocument()
    expect(screen.getByText('214')).toBeInTheDocument()
    expect(screen.getByText('+38.2K')).toBeInTheDocument()
    expect(screen.getByText('-12.4K')).toBeInTheDocument()
    expect(screen.getByText('woocommerce/woocommerce · 92')).toBeInTheDocument()
    expect(screen.getByText('+1 more')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', 'https://github.com/faisalahammad')
  })

  it('sends signed-out visitors to login to follow', () => {
    render(<ProfileHeader model={model} profileId="p1" viewer={null} />)
    expect(screen.getByRole('link', { name: 'Follow' })).toHaveAttribute('href', '/login')
  })

  it('shows Manage repos to the owner instead of Follow', () => {
    render(<ProfileHeader model={model} profileId="p1" viewer={{ id: 'p1', isOwner: true, isFollowing: false }} />)
    expect(screen.getByRole('link', { name: /manage repos/i })).toHaveAttribute('href', '/settings')
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument()
  })

  it('shows the follow state to other signed-in users', () => {
    render(<ProfileHeader model={model} profileId="p1" viewer={{ id: 'p2', isOwner: false, isFollowing: true }} />)
    expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument()
  })
})

const prs = (count: number) => Array.from({ length: count }, (_, index) => ({ number: index + 1, title: `PR ${index + 1}` }))

describe('ActivityGrid', () => {
  it('renders 53 weeks of days and ignores PRs older than the grid', () => {
    const { container } = render(<ActivityGrid activity={{ [today]: prs(3), '1999-01-01': prs(9) }} />)

    expect(container.querySelectorAll('[role="group"] > span')).toHaveLength(53 * 7)
    expect(screen.getByRole('group', { name: /^3 merged pull requests in the last year/ })).toBeInTheDocument()
  })

  it('shows a tooltip with up to three PR titles on hover', () => {
    render(<ActivityGrid activity={{ [today]: prs(4) }} />)

    fireEvent.mouseEnter(screen.getByRole('img', { name: `4 PRs on ${formatActivityDate(today)}` }))

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('#1 PR 1')
    expect(tooltip).toHaveTextContent('#3 PR 3')
    expect(tooltip).not.toHaveTextContent('#4 PR 4')
    expect(tooltip).toHaveTextContent('+1 more')
  })
})

describe('activity helpers', () => {
  it('formats dates with ordinal suffixes', () => {
    expect(formatActivityDate('2026-10-22')).toBe('October 22nd')
    expect(formatActivityDate('2026-10-11')).toBe('October 11th')
    expect(formatActivityDate('2026-10-01')).toBe('October 1st')
  })

  it('counts active days, the longest streak and the busiest day', () => {
    const now = new Date('2026-11-04T12:00:00Z')
    const days = buildActivityDays(
      { '2026-11-01': prs(1), '2026-11-02': prs(2), '2026-11-03': prs(1), '2026-10-20': prs(5), '2026-11-05': prs(9) },
      now
    )
    const stats = getActivityStats(days)

    expect(days[days.length - 1].key).toBe('2026-11-07')
    expect(stats).toMatchObject({ total: 9, activeDays: 4, longestStreak: 3 })
    expect(stats.busiest?.key).toBe('2026-10-20')
  })
})
