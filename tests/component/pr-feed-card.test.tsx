import React from 'react'
import { render, screen } from '@testing-library/react'
import { PRFeedCard } from '@/components/feed/PRFeedCard'
import type { FeedPR } from '@/lib/feed'

jest.mock('lucide-react', () => ({
  ExternalLink: function ExternalLink() {
    return <span data-testid="external-link-icon">↗</span>
  },
}))

jest.mock('next/link', () => {
  return function MockNextLink({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
})

jest.mock('@/components/feed/ReactionBar', () => ({
  ReactionBar: () => <div data-testid="reaction-bar" />,
}))

const feedPR: FeedPR = {
  id: 'pr-1',
  pr_number: 1,
  title: 'Improve feed ranking',
  body_summary: 'Adds smarter ranking and readability improvements for the home feed.',
  pr_url: 'https://github.com/acme/repo/pull/1',
  repo_full_name: 'gocodebox/lifterlms',
  merged_at: '2026-04-08T10:00:00.000Z',
  additions: 10,
  deletions: 1,
  commits_count: 4,
  reaction_counts: {
    love: 0,
    thumbsup: 0,
    informative: 0,
    support: 0,
    funny: 0,
  },
  user_reaction: null,
  author: {
    id: 'user-2',
    github_username: 'gocodebox',
    github_avatar_url: null,
    display_name: 'Go Codebox',
  },
  score: 1,
}

describe('PRFeedCard', () => {
  it('renders author and repo metadata with stronger readable styles', () => {
    render(<PRFeedCard pr={feedPR} currentUserId="user-1" />)

    expect(screen.getByRole('link', { name: /@gocodebox/i }).className).toContain('text-foreground')
    expect(screen.getByText('gocodebox/lifterlms').className).toContain('text-foreground/80')
  })

  it('renders additions, deletions, and commits with distinct github-like colors', () => {
    const { container } = render(<PRFeedCard pr={feedPR} currentUserId="user-1" />)

    expect(screen.getByText('+10').className).toContain('text-green-600')
    expect(screen.getByText('−1').className).toContain('text-red-600')
    expect(screen.getByText('4 commits').className).toContain('text-foreground')
    expect(container.querySelector('.font-mono')).not.toBeNull()
  })

  it('renders an external link icon next to the PR title link', () => {
    render(<PRFeedCard pr={feedPR} currentUserId="user-1" />)

    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument()
  })

  it('cleans markdown noise and preserves inline code styling in the PR description', () => {
    render(
      <PRFeedCard
        pr={{
          ...feedPR,
          body_summary:
            '## Add `.claude/settings.local.json` to `.gitignore`\n\nThis prevents local Claude Code configuration from leaking.',
        }}
        currentUserId="user-1"
      />
    )

    expect(screen.queryByText('##')).not.toBeInTheDocument()
    expect(screen.getByText('Add')).toBeInTheDocument()
    expect(screen.getByText('.claude/settings.local.json')).toBeInTheDocument()
    expect(screen.getByText('.gitignore')).toBeInTheDocument()
    expect(screen.getByText('.claude/settings.local.json').tagName).toBe('CODE')
  })

  it('shows longer descriptions without the max-w-2xl constraint', () => {
    render(
      <PRFeedCard
        pr={{
          ...feedPR,
          body_summary:
            'Add `.claude/settings.local.json` to `.gitignore` This prevents local Claude Code configuration including API tokens from leaking into the repository and keeps developer-specific settings out of commits.',
        }}
        currentUserId="user-1"
      />
    )

    const description = screen.getByText(/This prevents local Claude Code configuration/i).closest('p')
    expect(description?.className).not.toContain('max-w-2xl')
  })
})
