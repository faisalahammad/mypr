'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface SyncStatus {
  success: boolean
  synced: number
  message: string
  error?: string
}

interface SyncResponse {
  last_synced: string | null
  total_prs: number
}

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncInfo, setSyncInfo] = useState<SyncResponse | null>(null)
  const supabase = createSupabaseClient()

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-prs')
      if (response.ok) {
        const data = await response.json()
        setSyncInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus(null)

    try {
      const response = await fetch('/api/sync-prs', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setSyncStatus({
          success: true,
          synced: data.synced,
          message: data.message
        })
        // Refresh sync info after successful sync
        await fetchSyncStatus()
      } else {
        setSyncStatus({
          success: false,
          synced: 0,
          message: data.message || 'Failed to sync PRs',
          error: data.error
        })
      }
    } catch (error) {
      setSyncStatus({
        success: false,
        synced: 0,
        message: error instanceof Error ? error.message : 'An error occurred while syncing',
        error: 'Network error'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Fetch sync status on mount
  useEffect(() => {
    fetchSyncStatus()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your GitHub repositories and sync your pull requests
          </p>
        </div>

        <div className="space-y-6">
          {/* Sync Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Sync Pull Requests
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Fetch your merged PRs from GitHub and update your portfolio
                </p>
              </div>
              <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Sync Status Info */}
            {syncInfo && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total PRs synced: <strong className="text-gray-900 dark:text-white">{syncInfo.total_prs}</strong>
                  </span>
                  {syncInfo.last_synced && (
                    <span className="text-gray-600 dark:text-gray-400">
                      Last synced: <strong className="text-gray-900 dark:text-white">
                        {new Date(syncInfo.last_synced).toLocaleString()}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Sync Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                size="lg"
                className="min-w-[200px]"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync PRs
                  </>
                )}
              </Button>

              {/* Sync Status Message */}
              {syncStatus && (
                <div className={`flex items-center gap-2 ${
                  syncStatus.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {syncStatus.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">{syncStatus.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">{syncStatus.message}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How it works
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Select which repositories to display in the Repositories section below</li>
                <li>• Click "Sync PRs" to fetch your merged pull requests from GitHub</li>
                <li>• Your PRs will be displayed on your public profile at <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/your-username</code></li>
              </ul>
            </div>
          </Card>

          {/* Repositories Section - Placeholder for Phase 5 */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Repositories
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Coming soon in Phase 5: Select which GitHub repositories to display on your profile
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertCircle className="h-4 w-4" />
              <span>Repository management will be available in the next phase</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
