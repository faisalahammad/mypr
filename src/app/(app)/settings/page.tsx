'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  GitPullRequest,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppShell } from '@/components/layout/AppShell'
import type { DateRange } from '@/lib/github'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '1m', label: 'Last 1 month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '24m', label: 'Last 24 months' },
  { value: 'lifetime', label: 'Lifetime' },
]

function getRangeLabel(rangeValue: string | null): string {
  if (!rangeValue) return 'Not synced yet'
  return DATE_RANGE_OPTIONS.find((o) => o.value === rangeValue)?.label ?? rangeValue
}

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
  last_date_range: string | null
}

interface CachedRepo {
  repo_full_name: string
  description: string | null
  is_active: boolean
  pr_count: number
  last_synced_at: string | null
  owner_avatar_url: string | null
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedRange = DATE_RANGE_OPTIONS.find((option) => option.value === dateRange) ?? DATE_RANGE_OPTIONS[1]

  const persistedRangeLabel = getRangeLabel(syncInfo?.last_date_range ?? null)

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-prs')
      if (!response.ok) return
      const data = await response.json()
      setSyncInfo(data)
    } catch {
      // noop
    }
  }, [])

  const fetchRepos = useCallback(async () => {
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
  }, [])

  const handleRepoToggle = async (repoFullName: string, nextValue: boolean) => {
    if (pendingRepos[repoFullName]) return

    setRepoUpdateError(null)
    setPendingRepos((current) => ({ ...current, [repoFullName]: true }))

    const previousRepos = repos
    const previousActiveCount = activeCount
    setRepos(repos.map((repo) => (
      repo.repo_full_name === repoFullName
        ? { ...repo, is_active: nextValue }
        : repo
    )))
    setActiveCount((current) => current + (nextValue ? 1 : -1))

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
      setRepos(previousRepos)
      setActiveCount(previousActiveCount)
      setRepoUpdateError(error instanceof Error ? error.message : 'Failed to update repository')
    } finally {
      setPendingRepos((current) => ({ ...current, [repoFullName]: false }))
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
        setSyncStatus({
          success: true,
          synced: data.synced,
          repos_found: data.repos_found,
          message: data.message,
        })
        await Promise.all([fetchSyncStatus(), fetchRepos()])
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
        message: error instanceof Error ? error.message : 'Network error',
        error: 'Network error',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    Promise.allSettled([fetchRepos(), fetchSyncStatus()])
  }, [fetchRepos, fetchSyncStatus])

  useEffect(() => {
    if (!showDateDropdown) return

    const handlePointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDateDropdown(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDateDropdown])

  const repoStats = useMemo(() => {
    const totalRepos = repos.length
    const inactiveCount = totalRepos - activeCount
    const totalCachedPRs = repos.reduce((sum, repo) => sum + repo.pr_count, 0)
    return { totalRepos, inactiveCount, totalCachedPRs }
  }, [activeCount, repos])

  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1
      }
      return a.repo_full_name.localeCompare(b.repo_full_name)
    })
  }, [repos])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(235,71,153,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.88))]">
      <AppShell className="py-10">
        <div className="space-y-6">
          <Card className="overflow-visible border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Contribution sync
                  </p>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Settings</h1>
                  <p className="mt-2 max-w-2xl text-muted-foreground">
                    Keep your public portfolio fresh, choose the PR window you want to sync, and decide which repositories deserve a spotlight.
                  </p>
                </div>
                <GitHubMark />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Cached PRs</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{syncInfo?.total_prs ?? repoStats.totalCachedPRs}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Active repos</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Synced range</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{persistedRangeLabel}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Last synced</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatDate(syncInfo?.last_synced ?? null)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-visible border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Sync your data</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a date range, then refresh both PR history and repository cache in one pass.
                </p>
              </div>
              <RefreshCw className={`h-5 w-5 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={showDateDropdown}
                  className="flex min-w-[220px] items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/60"
                  onClick={() => setShowDateDropdown((current) => !current)}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {selectedRange.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDateDropdown && (
                  <div
                    role="listbox"
                    className="absolute left-0 z-30 mt-2 max-h-72 min-w-[260px] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-2xl shadow-slate-900/10"
                  >
                    {DATE_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={dateRange === option.value}
                        className={`flex w-full flex-col rounded-xl px-3 py-3 text-left transition-colors ${
                          dateRange === option.value
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/60'
                        }`}
                        onClick={() => {
                          setDateRange(option.value)
                          setShowDateDropdown(false)
                        }}
                      >
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="min-w-[160px] rounded-2xl gap-2 px-5 py-6 text-base"
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

            {syncStatus && (
              <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
                syncStatus.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}>
                {syncStatus.success ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{syncStatus.message}</p>
                  {syncStatus.success && syncStatus.repos_found !== undefined && (
                    <p className="mt-1 text-xs opacity-80">
                      Found {syncStatus.repos_found} repositories with merged PRs in this range.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What happens during sync</p>
              <ol className="mt-2 space-y-1.5">
                <li>1. Search GitHub for PRs you authored that were merged.</li>
                <li>2. Refresh repository cache entries and update per-repo PR counts.</li>
                <li>3. Use the toggles below to decide what appears on your public profile.</li>
              </ol>
            </div>
          </Card>

          <Card className="border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Repository visibility</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Turn on only the repos you want to show on your profile, timeline, and feed. Everything else stays cached privately.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                {activeCount} active / {repoStats.totalRepos} total
              </div>
            </div>

            {repoUpdateError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{repoUpdateError}</span>
              </div>
            )}

            {isLoadingRepos && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-2xl border border-border bg-muted/30" />
                ))}
              </div>
            )}

            {repoError && !isLoadingRepos && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="space-y-3">
                    <p className="font-medium text-amber-900">Unable to load repositories</p>
                    <p className="text-sm text-amber-800">{repoError}</p>
                    <Button onClick={fetchRepos} size="sm" variant="outline">Retry</Button>
                  </div>
                </div>
              </div>
            )}

            {!isLoadingRepos && !repoError && repos.length === 0 && (
              <div className="mt-5 rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
                <GitPullRequest className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium text-foreground">No repositories discovered yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Start a sync to build your repository cache. Once PRs are found, you can curate exactly what shows on your profile.
                </p>
              </div>
            )}

            {!isLoadingRepos && !repoError && repos.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {sortedRepos.map((repo) => {
                  const [owner, name] = repo.repo_full_name.split('/')
                  const isPending = pendingRepos[repo.repo_full_name]

                  return (
                    <div
                      key={repo.repo_full_name}
                      className={`rounded-3xl border p-4 transition-all ${
                        repo.is_active
                          ? 'border-primary/30 bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-border/80 bg-background/85'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={repo.owner_avatar_url ?? undefined} alt={owner} />
                              <AvatarFallback className="text-xs">{owner.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  {owner}
                                </span>
                                <h3 className="text-base font-semibold text-foreground">{name}</h3>
                              </div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {repo.description || 'No description available.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2">
                            <Switch
                              aria-label={`Toggle repository ${repo.repo_full_name}`}
                              checked={repo.is_active}
                              disabled={isPending}
                              onCheckedChange={(checked) => handleRepoToggle(repo.repo_full_name, checked)}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1.5">
                            <GitPullRequest className="h-3.5 w-3.5 text-primary" />
                            <strong className="text-foreground">{repo.pr_count}</strong> merged PR{repo.pr_count !== 1 ? 's' : ''}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(repo.last_synced_at)}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
                            repo.is_active ? 'bg-primary/12 text-primary' : 'bg-muted/70 text-muted-foreground'
                          }`}>
                            <Eye className="h-3.5 w-3.5" />
                            {repo.is_active ? 'Public' : 'Private'}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {repo.is_active ? 'Visible on profile, timeline, and feed' : 'Hidden from public profile — toggle to show'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </div>
  )
}
