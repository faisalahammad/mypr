'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, Star } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { GitHubRepo } from '@/lib/github'

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

interface RepoResponse {
  success: boolean
  repos: GitHubRepoWithSelection[]
  total_count: number
  active_count: number
  error?: string
  message?: string
}

interface GitHubRepoWithSelection extends GitHubRepo {
  is_active: boolean
}

function GitHubMark() {
  return (
    <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  )
}

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncInfo, setSyncInfo] = useState<SyncResponse | null>(null)
  const [repos, setRepos] = useState<GitHubRepoWithSelection[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [isLoadingRepos, setIsLoadingRepos] = useState(true)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [repoUpdateError, setRepoUpdateError] = useState<string | null>(null)
  const [pendingRepos, setPendingRepos] = useState<Record<string, boolean>>({})

  const fetchSyncStatus = async () => {
    const response = await fetch('/api/sync-prs')
    if (!response.ok) {
      throw new Error('Failed to fetch sync status')
    }

    const data = await response.json()
    setSyncInfo(data)
  }

  const fetchRepos = async () => {
    setIsLoadingRepos(true)
    setRepoError(null)

    try {
      const response = await fetch('/api/repos')
      const data: RepoResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load repositories')
      }

      setRepos(data.repos)
      setActiveCount(data.active_count)
    } catch (error) {
      setRepoError(error instanceof Error ? error.message : 'Unable to load repositories')
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const loadPageData = async () => {
    await Promise.allSettled([fetchRepos(), fetchSyncStatus()])
  }

  const handleRepoToggle = async (repoFullName: string, nextValue: boolean) => {
    if (pendingRepos[repoFullName]) {
      return
    }

    setRepoUpdateError(null)
    setPendingRepos((current) => ({ ...current, [repoFullName]: true }))

    const previousRepos = repos
    const previousActiveCount = activeCount
    const nextRepos = repos.map((repo) =>
      repo.full_name === repoFullName ? { ...repo, is_active: nextValue } : repo
    )

    setRepos(nextRepos)
    setActiveCount((current) => current + (nextValue ? 1 : -1))

    try {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_full_name: repoFullName,
          is_active: nextValue,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update repository')
      }
    } catch (error) {
      setRepos(previousRepos)
      setActiveCount(previousActiveCount)
      setRepoUpdateError(error instanceof Error ? error.message : 'Failed to update repository')
    } finally {
      setPendingRepos((current) => ({ ...current, [repoFullName]: false }))
    }
  }

  const handleSync = async () => {
    if (activeCount === 0) {
      return
    }

    setIsSyncing(true)
    setSyncStatus(null)

    try {
      const response = await fetch('/api/sync-prs', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setSyncStatus({
          success: true,
          synced: data.synced,
          message: data.message,
        })
        await fetchSyncStatus()
      } else {
        setSyncStatus({
          success: false,
          synced: 0,
          message: data.message || 'Failed to sync PRs',
          error: data.error,
        })
      }
    } catch (error) {
      setSyncStatus({
        success: false,
        synced: 0,
        message: error instanceof Error ? error.message : 'An error occurred while syncing',
        error: 'Network error',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadPageData()
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
              <GitHubMark />
            </div>

            {syncInfo && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
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

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Button
                onClick={handleSync}
                disabled={isSyncing || isLoadingRepos || activeCount === 0}
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

            {activeCount === 0 && !isLoadingRepos && !repoError && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                Activate at least one repository to enable syncing.
              </p>
            )}

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

          <Card className="p-6">
            <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Repositories
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose which GitHub repositories are included in your public profile and sync.
                </p>
              </div>
              <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {activeCount} active of {repos.length} repositories
              </div>
            </div>

            {repoUpdateError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span>{repoUpdateError}</span>
              </div>
            )}

            {repoError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Unable to load repositories
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {repoError}
                      </p>
                    </div>
                    <Button onClick={fetchRepos} size="sm" variant="outline">
                      Retry loading repositories
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isLoadingRepos && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                      </div>
                      <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingRepos && !repoError && repos.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white">
                  No repositories found
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  GitHub did not return any repositories for your account yet.
                </p>
              </div>
            )}

            {!isLoadingRepos && !repoError && repos.length > 0 && (
              <div className="space-y-3">
                {repos.map((repo) => (
                  <div
                    key={repo.full_name}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {repo.full_name}
                          </p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {repo.visibility}
                          </span>
                          {repo.language && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {repo.language}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {repo.stargazers_count}
                          </span>
                          <span>{repo.is_active ? 'Included in sync' : 'Excluded from sync'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {repo.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          aria-label={`Toggle repository ${repo.full_name}`}
                          checked={repo.is_active}
                          disabled={pendingRepos[repo.full_name]}
                          onCheckedChange={(checked) => handleRepoToggle(repo.full_name, checked)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
