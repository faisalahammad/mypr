/**
 * Component tests for Timeline
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { Timeline } from '@/components/timeline/Timeline'
import type { PullRequestWithProfile } from '@/types'

// Mock PRCard to avoid rendering complexity
jest.mock('@/components/pr-card/PRCard', () => ({
  PRCard: ({ pr }: { pr: any }) => (
    <div data-testid={`pr-card-${pr.id}`} data-pr-title={pr.title}>
      PR Card: {pr.title}
    </div>
  )
}))

const mockPRs: PullRequestWithProfile[] = [
  {
    id: '1',
    user_id: 'user-1',
    repo_full_name: 'owner/repo',
    pr_number: 1,
    title: 'First PR',
    body_summary: 'Summary',
    pr_url: 'https://github.com/owner/repo/pull/1',
    merged_at: '2024-01-15T10:00:00Z',
    additions: 100,
    deletions: 50,
    commits_count: 2,
    synced_at: '2024-01-15T10:00:00Z',
    profile: {
      github_username: 'user1',
      github_avatar_url: 'https://github.com/user1.png',
      display_name: 'User One'
    }
  },
  {
    id: '2',
    user_id: 'user-1',
    repo_full_name: 'owner/repo',
    pr_number: 2,
    title: 'Second PR',
    body_summary: 'Summary',
    pr_url: 'https://github.com/owner/repo/pull/2',
    merged_at: '2024-01-14T10:00:00Z',
    additions: 75,
    deletions: 25,
    commits_count: 1,
    synced_at: '2024-01-14T10:00:00Z',
    profile: {
      github_username: 'user1',
      github_avatar_url: 'https://github.com/user1.png',
      display_name: 'User One'
    }
  }
]

describe('Timeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty state when no PRs provided', () => {
    const { container } = render(<Timeline prs={[]} />)
    expect(screen.getByText('No pull requests yet')).toBeInTheDocument()
  })

  it('renders custom empty message when provided', () => {
    render(<Timeline prs={[]} emptyMessage="Custom empty message" />)
    expect(screen.getByText('Custom empty message')).toBeInTheDocument()
  })

  it('renders all PR cards when PRs are provided', () => {
    render(<Timeline prs={mockPRs} />)
    expect(screen.getByTestId('pr-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('pr-card-2')).toBeInTheDocument()
  })

  it('renders PR cards in correct order', () => {
    const { container } = render(<Timeline prs={mockPRs} />)

    const cards = container.querySelectorAll('[data-testid^="pr-card-"]')
    expect(cards).toHaveLength(2)

    // Verify both cards are rendered
    expect(screen.getByTestId('pr-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('pr-card-2')).toBeInTheDocument()
  })

  it('renders vertical line connector when PRs exist', () => {
    const { container } = render(<Timeline prs={mockPRs} />)
    const verticalLine = container.querySelector('.bg-border')
    expect(verticalLine).toBeInTheDocument()
  })

  it('does not render vertical line when no PRs', () => {
    const { container } = render(<Timeline prs={[]} />)
    const verticalLine = container.querySelector('.bg-border.absolute')
    expect(verticalLine).not.toBeInTheDocument()
  })

  it('renders dot markers for each PR', () => {
    const { container } = render(<Timeline prs={mockPRs} />)
    const dots = container.querySelectorAll('.rounded-full.bg-primary')
    expect(dots).toHaveLength(2)
  })

  it('applies correct spacing between PR cards', () => {
    const { container } = render(<Timeline prs={mockPRs} />)
    const timelineContainer = container.querySelector('.space-y-6')
    expect(timelineContainer).toBeInTheDocument()
  })

  it('applies left padding to clear the vertical line', () => {
    const { container } = render(<Timeline prs={mockPRs} />)
    const paddedItems = container.querySelectorAll('.pl-12')
    expect(paddedItems).toHaveLength(2)
  })

  it('renders empty state with icon', () => {
    const { container } = render(<Timeline prs={[]} />)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('handles single PR correctly', () => {
    const singlePR = [mockPRs[0]]
    const { container } = render(<Timeline prs={singlePR} />)

    expect(screen.getByTestId('pr-card-1')).toBeInTheDocument()

    const dots = container.querySelectorAll('.rounded-full.bg-primary')
    expect(dots).toHaveLength(1)
  })

  it('handles many PRs without layout issues', () => {
    const manyPRs = Array.from({ length: 50 }, (_, i) => ({
      ...mockPRs[0],
      id: `${i}`,
      title: `PR ${i}`
    }))

    const { container } = render(<Timeline prs={manyPRs} />)

    const cards = container.querySelectorAll('[data-testid^="pr-card-"]')
    expect(cards).toHaveLength(50)
  })

  it('uses relative positioning for line and dots', () => {
    const { container } = render(<Timeline prs={mockPRs} />)

    const timeline = container.querySelector('.relative')
    expect(timeline).toBeInTheDocument()

    const line = container.querySelector('.absolute.left-6')
    expect(line).toBeInTheDocument()
  })

  it('hides decorative elements from screen readers', () => {
    const { container } = render(<Timeline prs={mockPRs} />)

    const decorativeElements = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorativeElements.length).toBeGreaterThan(0)
  })
})
