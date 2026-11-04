'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Database,
  GitPullRequest,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppShell } from '@/components/layout/AppShell'
import type { SyncProgressEvent } from '@/lib/github'
import { cn } from '@/lib/utils'

interface SyncStatus {
  success: boolean
  message: string
}

interface SyncResponse {
  last_synced: string | null
  github_username?: string | null
}

type SyncStreamLine =
  | SyncProgressEvent
  | { stage: 'done'; message: string }
  | { stage: 'error'; message: string }

type SyncStage = SyncProgressEvent['stage'] | 'done'
type StepStatus = 'idle' | 'active' | 'done' | 'error'

interface SyncCount {
  done: number
  total: number
}

interface SyncProgress {
  stage: SyncStage
  details: SyncCount
  saving: SyncCount
  log: string[]
}

const MAX_LOG_LINES = 6
const NO_COUNT: SyncCount = { done: 0, total: 0 }
const STAGE_ORDER: SyncStage[] = ['searching', 'details', 'saving', 'done']

const SYNC_STEPS = [
  { icon: Search, title: 'Search GitHub', description: 'Find every merged PR you authored' },
  { icon: GitPullRequest, title: 'Read PR details', description: 'Lines changed and commit counts' },
  { icon: Database, title: 'Save repositories', description: 'Update your repo list and PR counts' },
]

const DOT_STYLES: Record<StepStatus, string> = {
  idle: 'border-border bg-white text-muted-foreground',
  active: 'border-primary bg-white text-primary',
  done: 'border-emerald-600 bg-emerald-600 text-white',
  error: 'border-destructive bg-destructive text-white',
}

const NOTE_STYLES: Record<StepStatus, string> = {
  idle: '',
  active: 'text-primary',
  done: 'text-emerald-700',
  error: 'text-destructive',
}

function applyProgressEvent(current: SyncProgress, event: SyncProgressEvent): SyncProgress {
  if (event.stage === 'searching') return { ...current, stage: 'searching' }
  if (event.stage === 'details') {
    return { ...current, stage: 'details', details: { done: event.done, total: event.total } }
  }
  return {
    ...current,
    stage: 'saving',
    saving: { done: event.done, total: event.total },
    log: [...current.log, `${event.repo} · ${event.prs} PR${event.prs === 1 ? '' : 's'}`].slice(-MAX_LOG_LINES),
  }
}

// Searching ~5%, reading PR details up to 70%, saving repos up to 100%
function getPercent({ stage, details, saving }: SyncProgress): number {
  if (stage === 'done') return 100
  if (stage === 'searching') return 5
  if (stage === 'details') return 5 + Math.round((details.done / Math.max(details.total, 1)) * 65)
  return 70 + Math.round((saving.done / Math.max(saving.total, 1)) * 30)
}

function getProgressLabel({ stage, details, saving }: SyncProgress): string {
  if (stage === 'searching') return 'Searching GitHub for your merged PRs…'
  if (stage === 'details') return `Reading PR details… ${details.done} of ${details.total}`
  if (stage === 'saving') return `Saving repositories… ${saving.done} of ${saving.total}`
  return ''
}

function getStepStatus(index: number, progress: SyncProgress | null, failed: boolean): StepStatus {
  if (!progress) return 'idle'
  const current = STAGE_ORDER.indexOf(progress.stage)
  if (index < current) return 'done'
  if (index > current) return 'idle'
  return failed ? 'error' : 'active'
}

function getStepNote(index: number, status: StepStatus, progress: SyncProgress | null): string {
  if (!progress || status === 'idle') return ''
  if (index === 0) return status === 'done' ? `${progress.details.total} new` : ''
  const { done, total } = index === 1 ? progress.details : progress.saving
  if (status === 'done') return total > 0 ? `${total} ${index === 1 ? 'read' : 'saved'}` : ''
  return `${done} / ${total}`
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

function sortReposByName(repoList: CachedRepo[]) {
  return [...repoList].sort((a, b) => {
    const [, aRepoName = a.repo_full_name] = a.repo_full_name.split('/')
    const [, bRepoName = b.repo_full_name] = b.repo_full_name.split('/')
    const repoNameComparison = aRepoName.localeCompare(bRepoName)

    if (repoNameComparison !== 0) {
      return repoNameComparison
    }

    return a.repo_full_name.localeCompare(b.repo_full_name)
  })
}

interface RepoRowProps {
  repo: CachedRepo
  owner: string
  isPending: boolean
  onToggle: (repoFullName: string, nextValue: boolean) => void
  hasMounted: boolean
}

function RepoRow({ repo, owner, isPending, onToggle, hasMounted }: RepoRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={repo.owner_avatar_url ?? undefined} alt={owner} />
        <AvatarFallback className="text-xs">{owner.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-medium text-foreground">{repo.repo_full_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {repo.pr_count} merged PR{repo.pr_count !== 1 ? 's' : ''}
          {' · '}
          {repo.is_active ? 'Shown on profile' : 'Hidden from profile'}
          {hasMounted && repo.last_synced_at ? ` · synced ${formatDate(repo.last_synced_at)}` : ''}
        </p>
        {repo.description ? (
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{repo.description}</p>
        ) : null}
      </div>
      <Switch
        aria-label={`Show ${repo.repo_full_name} on profile`}
        checked={repo.is_active}
        disabled={isPending}
        onCheckedChange={(checked) => onToggle(repo.repo_full_name, checked)}
      />
    </li>
  )
}

function SyncSteps({ progress, failed }: { progress: SyncProgress | null; failed: boolean }) {
  return (
    <ol aria-label="Sync steps" className="rounded-2xl border border-border bg-background/70 py-1.5">
      {SYNC_STEPS.map((step, index) => {
        const status = getStepStatus(index, progress, failed)
        const previousDone = index > 0 && getStepStatus(index - 1, progress, failed) === 'done'
        const Icon = step.icon

        return (
          <li key={step.title} className="relative grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 px-4 py-2.5">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn('absolute -top-2 left-[29px] h-4 w-0.5', previousDone ? 'bg-emerald-600' : 'bg-border')}
              />
            ) : null}
            <span className={cn('relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px]', DOT_STYLES[status])}>
              {status === 'active' ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none" />
              ) : status === 'done' ? (
                <Check className="h-3.5 w-3.5" />
              ) : status === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </span>
            <div>
              <p className={cn('text-sm leading-tight', status === 'idle' ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground')}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className={cn('font-mono text-xs tabular-nums', NOTE_STYLES[status])}>
              {getStepNote(index, status, progress)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

interface SetupChecklistProps {
  hasSynced: boolean
  hasShownRepo: boolean
  username: string | null
  isSyncing: boolean
  onSync: () => void
}

function SetupChecklist({ hasSynced, hasShownRepo, username, isSyncing, onSync }: SetupChecklistProps) {
  const steps = [
    { label: 'Sign in with GitHub', done: true },
    { label: 'Sync your merged PRs', done: hasSynced },
    { label: 'Choose repositories to show on your profile', done: hasShownRepo },
    { label: 'View and share your profile', done: false },
  ]
  const currentIndex = steps.findIndex((step) => !step.done)

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground">Get your profile ready</h2>
      <p className="mt-1 text-sm text-muted-foreground">Three quick steps and your PR timeline is live.</p>
      <ol className="mt-5 grid gap-3">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex
          return (
            <li key={step.label} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 font-mono text-xs font-semibold',
                  step.done && 'border-emerald-600 bg-emerald-600 text-white',
                  isCurrent && 'border-primary text-primary',
                  !step.done && !isCurrent && 'border-border text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className={cn(step.done ? 'text-muted-foreground line-through' : 'text-foreground', isCurrent && 'font-medium')}>
                {step.label}
                <span className="sr-only">{step.done ? ' (done)' : isCurrent ? ' (next step)' : ''}</span>
              </span>
              {isCurrent && index === 1 ? (
                <Button size="sm" onClick={onSync} disabled={isSyncing}>
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </Button>
              ) : isCurrent && index === 2 ? (
                <a href="#repositories" className="text-sm font-medium text-primary hover:underline">Choose repos</a>
              ) : isCurrent && index === 3 && username ? (
                <Link href={`/${username}`} className="text-sm font-medium text-primary hover:underline">View profile</Link>
              ) : (
                <span />
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncInfo, setSyncInfo] = useState<SyncResponse | null>(null)
  const [repos, setRepos] = useState<CachedRepo[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(true)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [repoUpdateError, setRepoUpdateError] = useState<string | null>(null)
  const [pendingRepos, setPendingRepos] = useState<Record<string, boolean>>({})
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [repoFilter, setRepoFilter] = useState('')

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-prs')
      if (!response.ok) throw new Error('Could not load sync status')
      const data = await response.json()
      setSyncInfo(data)
    } catch {
      setSyncStatus((current) => current ?? {
        success: false,
        message: 'Could not load your sync status. Refresh the page to try again.',
      })
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
    } catch (error) {
      setRepoError(error instanceof Error ? error.message : 'Unable to load repositories')
    } finally {
      setIsLoadingRepos(false)
    }
  }, [])

  const handleRepoToggle = async (repoFullName: string, nextValue: boolean) => {
    if (isBulkUpdating || pendingRepos[repoFullName]) return

    setRepoUpdateError(null)
    setPendingRepos((current) => ({ ...current, [repoFullName]: true }))

    const previousRepos = repos
    setRepos(repos.map((repo) => (
      repo.repo_full_name === repoFullName
        ? { ...repo, is_active: nextValue }
        : repo
    )))

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
      setRepoUpdateError(error instanceof Error ? error.message : 'Failed to update repository')
    } finally {
      setPendingRepos((current) => ({ ...current, [repoFullName]: false }))
    }
  }

  const handleToggleAllRepos = async (nextValue: boolean) => {
    if (isBulkUpdating || repos.length === 0) return

    const reposToUpdate = repos.filter((repo) => repo.is_active !== nextValue)

    if (reposToUpdate.length === 0) return

    setRepoUpdateError(null)
    setIsBulkUpdating(true)

    const previousRepos = repos

    setPendingRepos((current) => {
      const nextPending = { ...current }
      for (const repo of reposToUpdate) {
        nextPending[repo.repo_full_name] = true
      }
      return nextPending
    })

    setRepos((current) => current.map((repo) => (
      reposToUpdate.some((candidate) => candidate.repo_full_name === repo.repo_full_name)
        ? { ...repo, is_active: nextValue }
        : repo
    )))

    const results = await Promise.allSettled(
      reposToUpdate.map(async (repo) => {
        const response = await fetch('/api/repos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_full_name: repo.repo_full_name, is_active: nextValue }),
        })
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to update repository')
        }
      })
    )

    const failedUpdates = results.filter((result) => result.status === 'rejected')

    if (failedUpdates.length > 0) {
      setRepos(previousRepos)
      setRepoUpdateError(
        `Failed to update ${failedUpdates.length} repositor${failedUpdates.length === 1 ? 'y' : 'ies'}.`
      )
    }

    setPendingRepos((current) => {
      const nextPending = { ...current }
      for (const repo of reposToUpdate) {
        nextPending[repo.repo_full_name] = false
      }
      return nextPending
    })
    setIsBulkUpdating(false)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus(null)
    setSyncProgress({ stage: 'searching', details: NO_COUNT, saving: NO_COUNT, log: [] })
    try {
      const response = await fetch('/api/sync-prs', {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson' },
      })

      let finalLine: Extract<SyncStreamLine, { stage: 'done' | 'error' }> | null = null
      const isStream = response.headers?.get('content-type')?.includes('application/x-ndjson') && response.body

      if (!response.ok || !isStream) {
        // Error responses (and non-streaming servers) answer with plain JSON
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || 'Failed to sync PRs')
        finalLine = { stage: 'done', message: data.message }
      }

      const reader = isStream && response.body ? response.body.getReader() : null
      const decoder = new TextDecoder()
      let buffer = ''

      while (reader) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as SyncStreamLine
          if (event.stage === 'done' || event.stage === 'error') {
            finalLine = event
            continue
          }
          setSyncProgress((current) => (current ? applyProgressEvent(current, event) : current))
        }
      }

      if (!finalLine || finalLine.stage === 'error') {
        throw new Error(finalLine?.message ?? 'Sync stopped before it finished')
      }

      setSyncProgress((current) => (current ? { ...current, stage: 'done' } : current))
      setSyncStatus({ success: true, message: finalLine.message })
      await Promise.all([fetchSyncStatus(), fetchRepos()])
    } catch (error) {
      setSyncStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    setHasMounted(true)
    Promise.allSettled([fetchRepos(), fetchSyncStatus()])
  }, [fetchRepos, fetchSyncStatus])

  const repoStats = useMemo(() => {
    const totalRepos = repos.length
    const activeRepos = repos.filter((repo) => repo.is_active)
    const activeCount = activeRepos.length
    const totalCachedPRs = repos.reduce((sum, repo) => sum + repo.pr_count, 0)
    const publicPRs = activeRepos.reduce((sum, repo) => sum + repo.pr_count, 0)
    return { totalRepos, activeCount, totalCachedPRs, publicPRs }
  }, [repos])

  // One list sorted by name so a row stays put when it is toggled
  const visibleRepos = useMemo(() => {
    const query = repoFilter.trim().toLowerCase()
    const sorted = sortReposByName(repos)
    return query ? sorted.filter((repo) => repo.repo_full_name.toLowerCase().includes(query)) : sorted
  }, [repos, repoFilter])

  const hasSynced = Boolean(syncInfo?.last_synced) || repos.length > 0
  const showChecklist = hasMounted && !isLoadingRepos && !repoError && !(hasSynced && repoStats.activeCount > 0)

  const allReposEnabled = repoStats.totalRepos > 0 && repoStats.activeCount === repoStats.totalRepos
  const enabledReposLabel = `${repoStats.activeCount} of ${repoStats.totalRepos} enabled`

  const syncFailed = syncProgress !== null && syncStatus?.success === false
  const syncPercent = syncProgress ? getPercent(syncProgress) : 0

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(235,71,153,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.88))]">
      <AppShell className="py-10">
        <div className="space-y-6">
          {showChecklist ? (
            <SetupChecklist
              hasSynced={hasSynced}
              hasShownRepo={repoStats.activeCount > 0}
              username={syncInfo?.github_username ?? null}
              isSyncing={isSyncing}
              onSync={handleSync}
            />
          ) : null}

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
                    Keep your public portfolio fresh and decide which repositories deserve a spotlight.
                  </p>
                </div>
                <GitHubMark />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Visible PRs</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{repoStats.publicPRs}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Lifetime PRs</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{repoStats.totalCachedPRs}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Active repos</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{repoStats.activeCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Last synced</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{hasMounted ? formatDate(syncInfo?.last_synced ?? null) : '—'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-visible border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-start">
              <div className="grid content-start gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Sync your data</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your whole merged-PR history, from your first PR to today. Runs on its own every day.
                  </p>
                </div>

                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  aria-busy={isSyncing}
                  className="relative w-full gap-2 overflow-hidden rounded-2xl px-5 py-6 text-base disabled:bg-primary/90 disabled:opacity-100"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                      Syncing
                      <span className="font-mono text-sm tabular-nums opacity-80">{syncPercent}%</span>
                      <progress
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-[3px] w-full appearance-none [&::-moz-progress-bar]:bg-white/80 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white/80"
                        max={100}
                        value={syncPercent}
                      />
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {syncFailed ? 'Try again' : 'Sync lifetime history'}
                    </>
                  )}
                </Button>

                <p className="min-h-5 text-sm text-muted-foreground">
                  {syncInfo?.last_synced ? (
                    <>
                      Last synced <span className="font-medium text-foreground">{formatDate(syncInfo.last_synced)}</span>
                      {` · ${repoStats.totalCachedPRs} PRs · ${repoStats.totalRepos} repos`}
                    </>
                  ) : syncInfo ? (
                    'Not synced yet'
                  ) : null}
                </p>

                {syncStatus && (
                  <div className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
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
                      {syncStatus.success && syncInfo?.github_username ? (
                        <Link href={`/${syncInfo.github_username}`} className="mt-2 inline-block text-xs font-semibold underline">
                          View your profile
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <SyncSteps progress={syncProgress} failed={syncFailed} />
            </div>

            <p className="sr-only" role="status">{isSyncing && syncProgress ? getProgressLabel(syncProgress) : ''}</p>

            {isSyncing && syncProgress && syncProgress.log.length > 0 ? (
              <ul className="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3 font-mono text-xs leading-6 text-muted-foreground">
                {syncProgress.log.map((line) => (
                  <li key={line}><span className="text-emerald-600">✓</span> {line}</li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card id="repositories" className="scroll-mt-20 border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Repository visibility</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Turn on only the repos you want to show on your profile, timeline, and feed. Everything else stays cached privately.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                <div className="space-y-1 text-right">
                  <p className="text-xs font-medium text-muted-foreground">All repositories</p>
                  <p className="text-xs text-muted-foreground">{enabledReposLabel}</p>
                </div>
                <Switch
                  aria-label="Toggle all repositories"
                  checked={allReposEnabled}
                  disabled={isBulkUpdating || isLoadingRepos || !!repoError || repoStats.totalRepos === 0}
                  onCheckedChange={handleToggleAllRepos}
                />
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
                  Sync once to find the repositories you have merged PRs in. Then choose which ones show on your profile.
                </p>
                <Button className="mt-5 gap-2" onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                  {isSyncing ? 'Syncing…' : 'Sync my PRs'}
                </Button>
              </div>
            )}

            {!isLoadingRepos && !repoError && repos.length > 0 && (
              <div className="mt-5 grid gap-3">
                <label className="relative block">
                  <span className="sr-only">Filter repositories</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="repo-filter"
                    type="search"
                    value={repoFilter}
                    onChange={(event) => setRepoFilter(event.target.value)}
                    placeholder={`Filter ${repos.length} repositories…`}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </label>

                {visibleRepos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No repositories match &ldquo;{repoFilter}&rdquo;.
                  </p>
                ) : (
                  <ul className="overflow-hidden rounded-2xl border border-border bg-background" aria-label="Repositories">
                    {visibleRepos.map((repo) => {
                      const [owner] = repo.repo_full_name.split('/')
                      return (
                        <RepoRow
                          key={repo.repo_full_name}
                          repo={repo}
                          owner={owner}
                          isPending={isBulkUpdating || Boolean(pendingRepos[repo.repo_full_name])}
                          onToggle={handleRepoToggle}
                          hasMounted={hasMounted}
                        />
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </div>
  )
}
