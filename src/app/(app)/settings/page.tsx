'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  GitPullRequest,
  Calendar,
  Clock,
  Database,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { DateRange } from '@/lib/github'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '1m', label: 'Last 1 month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '24m', label: 'Last 24 months' },
  { value: 'lifetime', label: 'Lifetime (all time)' },
]

interface SyncStatus {
  success: boolean
  synced: number
  repos_found?: number
  message: string
  error?: string
}

interface SyncResponse {
  last_synced: string | null
  total_prs: number
}

interface CachedRepo {
  repo_full_name: string
  description: string | null
  is_active: boolean
  pr_count: number
  last_synced_at: string | null
}

interface RepoResponse {
  success: boolean
  repos: CachedRepo[]
  total_count: number
  active_count: number
  error?: string
  message?: string
}

function GitHubMark() {
  return (
    <svg className="h-7 w-7 opacity-40" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncInfo, setSyncInfo] = useState<SyncResponse | null>(null)
  const [repos, setRepos] = useState<CachedRepo[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [isLoadingRepos, setIsLoadingRepos] = useState(true)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [repoUpdateError, setRepoUpdateError] = useState<string | null>(null)
  const [pendingRepos, setPendingRepos] = useState<Record<string, boolean>>({})
  const [dateRange, setDateRange] = useState<DateRange>('3m')
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-prs')
      if (!response.ok) return
      const data = await response.json()
      setSyncInfo(data)
    } catch { /* silent */ }
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

  const handleRepoToggle = async (repoFullName: string, nextValue: boolean) => {
    if (pendingRepos[repoFullName]) return

    setRepoUpdateError(null)
    setPendingRepos(cur => ({ ...cur, [repoFullName]: true }))

    const prevRepos = repos
    const prevActiveCount = activeCount
    setRepos(repos.map(r => r.repo_full_name === repoFullName ? { ...r, is_active: nextValue } : r))
    setActiveCount(cur => cur + (nextValue ? 1 : -1))

    try {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_full_name: repoFullName, is_active: nextValue }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update repository')
      }
    } catch (error) {
      setRepos(prevRepos)
      setActiveCount(prevActiveCount)
      setRepoUpdateError(error instanceof Error ? error.message : 'Failed to update repository')
    } finally {
      setPendingRepos(cur => ({ ...cur, [repoFullName]: false }))
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus(null)
    try {
      const response = await fetch('/api/sync-prs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange }),
      })
      const data = await response.json()
      if (response.ok) {
        setSyncStatus({ success: true, synced: data.synced, repos_found: data.repos_found, message: data.message })
        await Promise.all([fetchSyncStatus(), fetchRepos()])
      } else {
        setSyncStatus({ success: false, synced: 0, message: data.message || 'Failed to sync PRs', error: data.error })
      }
    } catch (error) {
      setSyncStatus({ success: false, synced: 0, message: error instanceof Error ? error.message : 'Network error', error: 'Network error' })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    Promise.allSettled([fetchRepos(), fetchSyncStatus()])
  }, [])

  const selectedRangeLabel = DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label ?? 'Select range'

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">

        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Sync your approved merged PRs from GitHub and manage which repos appear on your profile.
          </p>
        </div>

        {/* ── Sync Card ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sync Pull Requests</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fetches your PRs that were authored by you, merged, and approved by a reviewer.
              </p>
            </div>
            <GitHubMark />
          </div>

          {/* Sync info bar */}
          {syncInfo && (
            <div className="flex flex-wrap gap-4 text-sm rounded-lg border border-border bg-muted/40 px-4 py-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                <strong className="text-foreground">{syncInfo.total_prs}</strong> PRs cached
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last synced: <strong className="text-foreground">{formatDate(syncInfo.last_synced)}</strong>
              </span>
            </div>
          )}

          {/* Controls row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Date range picker */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted/60 transition-colors"
                onClick={() => setShowDateDropdown(v => !v)}
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {selectedRangeLabel}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDateDropdown && (
                <div className="absolute z-20 mt-1 left-0 min-w-[180px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {DATE_RANGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted/60 ${dateRange === opt.value ? 'text-primary font-medium bg-primary/5' : 'text-foreground'}`}
                      onClick={() => { setDateRange(opt.value); setShowDateDropdown(false) }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sync button */}
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="default"
              className="gap-2 min-w-[130px]"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync PRs
                </>
              )}
            </Button>
          </div>

          {/* Sync result feedback */}
          {syncStatus && (
            <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
              syncStatus.success
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              {syncStatus.success
                ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div>
                <p className="font-medium">{syncStatus.message}</p>
                {syncStatus.success && syncStatus.repos_found !== undefined && (
                  <p className="text-xs opacity-75 mt-0.5">
                    Found {syncStatus.repos_found} repo{syncStatus.repos_found !== 1 ? 's' : ''} with approved PRs.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground mb-1.5">How it works</p>
            <p>1. Choose a time range and click <strong>Sync PRs</strong>.</p>
            <p>2. We search GitHub for PRs you authored that were merged and approved.</p>
            <p>3. Repos appear below — toggle them on to include in your public profile.</p>
          </div>
        </Card>

        {/* ── Repositories Card ── */}
        <Card className="p-6">
          <div className="flex flex-col gap-1 mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Repositories</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Only repos with approved merged PRs appear here. Toggle to show on your public profile.
              </p>
            </div>
            {repos.length > 0 && (
              <span className="text-xs font-medium rounded-full bg-muted border border-border px-3 py-1 text-muted-foreground whitespace-nowrap">
                {activeCount} active / {repos.length} total
              </span>
            )}
          </div>

          {repoUpdateError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{repoUpdateError}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoadingRepos && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-muted/30 p-4 h-20" />
              ))}
            </div>
          )}

          {/* Error state */}
          {repoError && !isLoadingRepos && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0" />
                <div className="space-y-3">
                  <p className="font-medium text-amber-900 dark:text-amber-100">Unable to load repositories</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{repoError}</p>
                  <Button onClick={fetchRepos} size="sm" variant="outline">Retry</Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state — no sync done yet */}
          {!isLoadingRepos && !repoError && repos.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <GitPullRequest className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-foreground">No repos found yet</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                Hit <strong>Sync PRs</strong> above and we'll find every repo where your PRs were approved and merged.
              </p>
            </div>
          )}

          {/* Repository list */}
          {!isLoadingRepos && !repoError && repos.length > 0 && (
            <div className="space-y-3">
              {repos.map(repo => {
                const [owner, name] = repo.repo_full_name.split('/')
                const isPending = pendingRepos[repo.repo_full_name]
                return (
                  <div
                    key={repo.repo_full_name}
                    className={`rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 ${
                      repo.is_active
                        ? 'border-primary/30 ring-1 ring-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        {/* Repo name */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">{owner}/</span>
                          <span className="font-semibold text-foreground truncate">{name}</span>
                        </div>

                        {/* Description */}
                        {repo.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{repo.description}</p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GitPullRequest className="h-3.5 w-3.5 text-primary" />
                            <strong className="text-foreground">{repo.pr_count}</strong> merged PR{repo.pr_count !== 1 ? 's' : ''}
                          </span>
                          {repo.last_synced_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(repo.last_synced_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggle */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-xs font-medium ${repo.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                          {repo.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          aria-label={`Toggle repository ${repo.repo_full_name}`}
                          checked={repo.is_active}
                          disabled={isPending}
                          onCheckedChange={checked => handleRepoToggle(repo.repo_full_name, checked)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
