/**
 * Component tests for PRCard
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { PRCard } from '@/components/pr-card/PRCard'

// Mock html2canvas (used by downloadAsImage)
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,abc' }))
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ExternalLink: () => <span data-testid="external-link-icon">↗</span>,
  Download: () => <span data-testid="download-icon">⬇</span>
}))

// Mock shadcn components to avoid rendering complexity
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="card-footer">{children}</div>
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props)
    }
    return <button {...props}>{children}</button>
  }
}))

const mockPR = {
  id: '1',
  user_id: 'user-1',
  repo_full_name: 'octocat/hello-world',
  pr_number: 42,
  title: 'Fix critical bug in authentication',
  body_summary: 'This PR fixes a critical security vulnerability',
  pr_url: 'https://github.com/octocat/hello-world/pull/42',
  merged_at: '2024-01-15T10:30:00Z',
  additions: 150,
  deletions: 50,
  commits_count: 3,
  synced_at: '2024-01-15T10:30:00Z'
}

describe('PRCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders PR title correctly', () => {
    render(<PRCard pr={mockPR} />)
    expect(screen.getByText('Fix critical bug in authentication')).toBeInTheDocument()
  })

  it('renders repository name in badge', () => {
    render(<PRCard pr={mockPR} />)
    expect(screen.getByText('octocat/hello-world')).toBeInTheDocument()
  })

  it('renders merged date', () => {
    render(<PRCard pr={mockPR} />)
    // Date formatting will show "Jan 15, 2024" for non-recent dates
    expect(screen.getByText(/Jan.*2024/)).toBeInTheDocument()
  })

  it('renders additions badge with green color class', () => {
    render(<PRCard pr={mockPR} />)
    const additionsBadge = screen.getByText('+150')
    expect(additionsBadge).toBeInTheDocument()
    expect(additionsBadge).toHaveClass('bg-green-100')
  })

  it('renders deletions badge with red color class', () => {
    render(<PRCard pr={mockPR} />)
    const deletionsBadge = screen.getByText('-50')
    expect(deletionsBadge).toBeInTheDocument()
    expect(deletionsBadge).toHaveClass('bg-red-100')
  })

  it('renders commits count with correct pluralization', () => {
    render(<PRCard pr={mockPR} />)
    expect(screen.getByText('3 commits')).toBeInTheDocument()
  })

  it('renders singular commit when count is 1', () => {
    const singleCommitPR = { ...mockPR, commits_count: 1 }
    render(<PRCard pr={singleCommitPR} />)
    expect(screen.getByText('1 commit')).toBeInTheDocument()
  })

  it('renders GitHub link with correct href', () => {
    render(<PRCard pr={mockPR} />)
    const link = screen.getByRole('link', { name: /fix critical bug in authentication/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://github.com/octocat/hello-world/pull/42')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders external link icon', () => {
    render(<PRCard pr={mockPR} />)
    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument()
  })

  it('handles PR with zero stats', () => {
    const zeroStatsPR = {
      ...mockPR,
      additions: 0,
      deletions: 0,
      commits_count: 0
    }
    render(<PRCard pr={zeroStatsPR} />)
    expect(screen.getByText('+0')).toBeInTheDocument()
    expect(screen.getByText('-0')).toBeInTheDocument()
    expect(screen.getByText('0 commits')).toBeInTheDocument()
  })

  it('handles PR with large numbers', () => {
    const largeStatsPR = {
      ...mockPR,
      additions: 5000,
      deletions: 2500,
      commits_count: 100
    }
    render(<PRCard pr={largeStatsPR} />)
    expect(screen.getByText('+5000')).toBeInTheDocument()
    expect(screen.getByText('-2500')).toBeInTheDocument()
    expect(screen.getByText('100 commits')).toBeInTheDocument()
  })

  it('renders download button', () => {
    render(<PRCard pr={mockPR} />)
    const downloadBtn = screen.getByRole('button', { name: /download pr card/i })
    expect(downloadBtn).toBeInTheDocument()
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
  })

  it('download button is enabled by default', () => {
    render(<PRCard pr={mockPR} />)
    const downloadBtn = screen.getByRole('button', { name: /download pr card/i })
    expect(downloadBtn).not.toBeDisabled()
  })

  it('renders suggested badge when the feed item is suggested', () => {
    render(<PRCard pr={{ ...mockPR, source: 'suggested' }} />)
    expect(screen.getByText('Suggested')).toBeInTheDocument()
  })
})
