/**
 * ProfileHeader: KPIs, top repo chips, follow/owner actions, 1-year activity grid
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { ProfileHeader, ActivityGrid } from '@/components/profile/ProfileHeader'
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
  stats: { linesAdded: 38200, lastSyncedAt: null },
  activity: { [today]: 3 },
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

describe('ActivityGrid', () => {
  it('renders 53 weeks of days and totals the last year', () => {
    const { container } = render(<ActivityGrid activity={{ [today]: 3, '1999-01-01': 9 }} />)

    expect(container.querySelectorAll('[role="img"] > span')).toHaveLength(53 * 7)
    expect(screen.getByRole('img', { name: '3 merged pull requests in the last year' })).toBeInTheDocument()
  })
})
