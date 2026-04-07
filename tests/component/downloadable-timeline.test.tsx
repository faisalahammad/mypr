/**
 * Component tests for DownloadableTimeline
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DownloadableTimeline } from '@/components/timeline/DownloadableTimeline'

// Mock downloadAsImage so tests don't touch html2canvas or DOM link creation
const mockDownloadAsImage = jest.fn(() => Promise.resolve())
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  downloadAsImage: (...args: unknown[]) => mockDownloadAsImage(...args)
}))

// Mock the Download icon
jest.mock('lucide-react', () => ({
  Download: () => <span data-testid="download-icon">⬇</span>
}))

// Mock Timeline to keep tests focused on DownloadableTimeline behavior
jest.mock('@/components/timeline/Timeline', () => ({
  Timeline: ({ prs, emptyMessage }: { prs: unknown[]; emptyMessage?: string }) => (
    <div data-testid="timeline">
      {prs.length === 0
        ? <p>{emptyMessage || 'No pull requests yet'}</p>
        : <p>{prs.length} PRs</p>
      }
    </div>
  )
}))

const mockPR = {
  id: '1',
  user_id: 'user-1',
  repo_full_name: 'octocat/hello-world',
  pr_number: 42,
  title: 'Fix bug',
  body_summary: null,
  pr_url: 'https://github.com/octocat/hello-world/pull/42',
  merged_at: '2024-01-15T10:30:00Z',
  additions: 10,
  deletions: 5,
  commits_count: 1,
  synced_at: '2024-01-15T10:30:00Z',
  profile: {
    github_username: 'octocat',
    github_avatar_url: null,
    display_name: null
  }
}

describe('DownloadableTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the Timeline component', () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
  })

  it('shows download button when PRs are present', () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    expect(screen.getByRole('button', { name: /download timeline/i })).toBeInTheDocument()
  })

  it('hides download button when no PRs', () => {
    render(<DownloadableTimeline prs={[]} />)
    expect(screen.queryByRole('button', { name: /download timeline/i })).not.toBeInTheDocument()
  })

  it('renders "Download Timeline" label', () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    expect(screen.getByText('Download Timeline')).toBeInTheDocument()
  })

  it('download button is enabled by default', () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    expect(screen.getByRole('button', { name: /download timeline/i })).not.toBeDisabled()
  })

  it('calls downloadAsImage when download button is clicked', async () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    fireEvent.click(screen.getByRole('button', { name: /download timeline/i }))

    await waitFor(() => {
      expect(mockDownloadAsImage).toHaveBeenCalledTimes(1)
    })
  })

  it('passes the container element and filename to downloadAsImage', async () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    fireEvent.click(screen.getByRole('button', { name: /download timeline/i }))

    await waitFor(() => {
      const [element, filename] = mockDownloadAsImage.mock.calls[0]
      expect(element).toBeInstanceOf(HTMLDivElement)
      expect(filename).toBe('pr-timeline.png')
    })
  })

  it('shows "Downloading…" label while download is in progress', async () => {
    let resolveDownload!: () => void
    mockDownloadAsImage.mockReturnValueOnce(
      new Promise<void>((resolve) => { resolveDownload = resolve })
    )

    render(<DownloadableTimeline prs={[mockPR]} />)
    fireEvent.click(screen.getByRole('button', { name: /download timeline/i }))

    await waitFor(() => {
      expect(screen.getByText('Downloading…')).toBeInTheDocument()
    })

    // Clean up — resolve the pending download
    resolveDownload()
  })

  it('re-enables the button after download completes', async () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    const btn = screen.getByRole('button', { name: /download timeline/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText('Download Timeline')).toBeInTheDocument()
    })
    expect(btn).not.toBeDisabled()
  })

  it('passes emptyMessage to Timeline', () => {
    render(<DownloadableTimeline prs={[]} emptyMessage="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders download icon inside button', () => {
    render(<DownloadableTimeline prs={[mockPR]} />)
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
  })
})
