/**
 * Tests for Settings Page component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '@/app/(app)/settings/page'

// Mock fetch
global.fetch = jest.fn()

describe('Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render sync button', () => {
    render(<SettingsPage />)
    const syncButton = screen.getByRole('button', { name: /sync prs/i })
    expect(syncButton).toBeInTheDocument()
  })

  it('should show syncing state when sync is in progress', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading state
    )

    render(<SettingsPage />)

    const syncButton = screen.getByRole('button', { name: /sync prs/i })
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText(/syncing/i)).toBeInTheDocument()
    })
  })

  it('should display success message after successful sync', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        synced: 5,
        message: 'Successfully synced 5 pull requests'
      })
    }

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    render(<SettingsPage />)

    const syncButton = screen.getByRole('button', { name: /sync prs/i })
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText(/successfully synced 5/i)).toBeInTheDocument()
    })
  })

  it('should display error message on sync failure', async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({
        error: 'Sync failed',
        message: 'Failed to fetch from GitHub'
      })
    }

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    render(<SettingsPage />)

    const syncButton = screen.getByRole('button', { name: /sync prs/i })
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })
  })

  it('should disable sync button while syncing', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {})
    )

    render(<SettingsPage />)

    const syncButton = screen.getByRole('button', { name: /sync prs/i })
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(syncButton).toBeDisabled()
    })
  })

  it('should display sync status info', async () => {
    const mockStatusResponse = {
      ok: true,
      json: async () => ({
        last_synced: new Date().toISOString(),
        total_prs: 10
      })
    }

    (global.fetch as jest.Mock).mockResolvedValue(mockStatusResponse)

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/total prs synced: 10/i)).toBeInTheDocument()
    })
  })
})
