'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { downloadAsImage } from '@/lib/utils'
import {
  deriveTimelineViews,
  getProfileResultsPreviewLabel,
  type ProfileResultsClientModel,
  type ProfileResultsView,
} from '@/lib/profile-results'
import styles from './ProfileResults.module.css'

interface ProfileResultsProps {
  model: ProfileResultsClientModel
  /** The signed-in viewer owns this profile */
  isOwner?: boolean
}

function formatTimelineDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getCaptureFilename(username: string, view: ProfileResultsView): string {
  const slug = view === 'summary' ? 'summary-stats' : view === 'timeline' ? 'timeline' : 'repo-grid'
  return `${username}-${slug}.png`
}

export function ProfileResults({ model, isOwner = false }: ProfileResultsProps) {
  // Derived here so the server sends each PR once (in `timeline`) instead of three times
  const { repoGrid, timelineByMonth } = useMemo(() => deriveTimelineViews(model.timeline), [model.timeline])
  const previewCardRef = useRef<HTMLDivElement>(null)
  const [activeView, setActiveView] = useState<ProfileResultsView>('repos')
  const [tweetModalOpen, setTweetModalOpen] = useState(false)
  const [copyToastVisible, setCopyToastVisible] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({})
  const [selectedMonthKey, setSelectedMonthKey] = useState(timelineByMonth[0]?.key ?? '')

  const { monthsByKey, yearTotals } = useMemo(() => {
    const totals = new Map<string, number>()
    for (const month of timelineByMonth) {
      const year = month.key.slice(0, 4)
      totals.set(year, (totals.get(year) ?? 0) + month.entries.length)
    }
    return { monthsByKey: new Map(timelineByMonth.map((month) => [month.key, month])), yearTotals: totals }
  }, [timelineByMonth])

  const selectedYear = selectedMonthKey.slice(0, 4)
  const selectedMonth = monthsByKey.get(selectedMonthKey)
  const yearMonths = MONTH_SHORT.map((short, index) => {
    const key = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
    return { key, short, count: monthsByKey.get(key)?.entries.length ?? 0 }
  })
  const yearMax = Math.max(1, ...yearMonths.map((month) => month.count))

  const selectYear = (year: string) => {
    // timelineByMonth is newest first, so this picks the latest month of that year
    const latest = timelineByMonth.find((month) => month.key.startsWith(year))
    if (latest) setSelectedMonthKey(latest.key)
  }

  const handleScreenshot = async () => {
    if (!previewCardRef.current) return

    setIsDownloading(true)

    try {
      await downloadAsImage(
        previewCardRef.current,
        getCaptureFilename(model.identity.username, activeView),
        activeView === 'timeline'
          ? { backgroundColor: '#f8fafc', maxHeight: 2200 }
          : { backgroundColor: '#f8fafc' }
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopyTweet = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopyToastVisible(true)
    window.setTimeout(() => setCopyToastVisible(false), 1600)
  }

  const handleCopyAllUrls = async () => {
    const urls = model.timeline.map((pr) => pr.url).join('\n')
    await navigator.clipboard.writeText(urls)
    setCopyToastVisible(true)
    window.setTimeout(() => setCopyToastVisible(false), 1600)
  }

  const handleCopyUrls = async (urls: string[]) => {
    await navigator.clipboard.writeText(urls.join('\n'))
    setCopyToastVisible(true)
    window.setTimeout(() => setCopyToastVisible(false), 1600)
  }

  const toggleRepoExpanded = (fullName: string) => {
    setExpandedRepos((current) => ({ ...current, [fullName]: !current[fullName] }))
  }

  if (model.counts.mergedPRs === 0) {
    return (
      <section
        aria-label="Profile results"
        className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
      >
        <svg className="h-9 w-9 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M6 8.5v7a2.5 2.5 0 0 0 2.5 2.5H15.5" />
        </svg>
        <h2 className="text-lg font-semibold text-foreground">
          {isOwner ? 'Your timeline is empty' : 'Nothing public yet'}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isOwner
            ? 'Sync your merged pull requests, then choose which repositories to show here.'
            : `@${model.identity.username} has not shared any merged pull requests yet.`}
        </p>
        {isOwner ? (
          <Link
            href="/settings"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sync my PRs
          </Link>
        ) : null}
      </section>
    )
  }

  return (
    <section className={styles.root} aria-label="Profile results">
      <div className={styles.inner}>
        <div className={styles.resultsHeader}>
          <div className={styles.resultsActions}>
            <button
              type="button"
              className={`${styles.buttonSm} ${styles.tweetButton}`}
              onClick={() => setTweetModalOpen(true)}
            >
              Tweet This
            </button>
            <button
              type="button"
              className={`${styles.buttonSm} ${styles.copyUrlsButton}`}
              onClick={handleCopyAllUrls}
            >
              Copy URLs
            </button>
            <button
              type="button"
              className={`${styles.buttonSm} ${styles.downloadButton}`}
              onClick={handleScreenshot}
              disabled={isDownloading}
            >
              {isDownloading ? 'Capturing…' : 'Download PNG'}
            </button>
          </div>
        </div>

        <div className={styles.styleTabs} aria-label="Profile result views">
          {([
            ['repos', 'Repo Grid'],
            ['summary', 'Summary Stats'],
            ['timeline', 'Timeline'],
          ] as Array<[ProfileResultsView, string]>).map(([view, label]) => (
            <button
              key={view}
              type="button"
              aria-pressed={activeView === view}
              className={`${styles.styleTab} ${activeView === view ? styles.styleTabActive : ''}`}
              onClick={() => setActiveView(view)}
            >
              {label}
            </button>
          ))}
        </div>

        <div ref={previewCardRef} className={styles.previewCard} data-testid="preview-card">
          <div className={styles.previewBar}>
            <div className={styles.previewDot} />
            <div className={styles.previewDot} />
            <div className={styles.previewDot} />
            <span className={styles.previewLabel}>{getProfileResultsPreviewLabel(activeView)}</span>
          </div>

          <div className={styles.previewContent}>
            {activeView === 'repos' && (
              <div className={styles.repoGrid}>
                {repoGrid.map((repo) => {
                  const isExpanded = Boolean(expandedRepos[repo.fullName])
                  const hasMore = repo.pullRequestCount > 3
                  const visiblePullRequests = isExpanded ? repo.pullRequests : repo.pullRequests.slice(0, 3)

                  return (
                    <article key={repo.fullName} className={styles.repoCard}>
                      <div className={styles.repoHeader}>
                        <div className={styles.repoIcon}>📁</div>
                        <div>
                          <a
                            href={`https://github.com/${repo.fullName}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.repoName}
                            title={repo.fullName}
                          >
                            {repo.name}
                          </a>
                          <div className={styles.repoOrg}>{repo.org}</div>
                        </div>
                      </div>

                      <div className={styles.repoCountRow}>
                        <div className={styles.repoCount}>
                          {repo.pullRequestCount} merged PR{repo.pullRequestCount === 1 ? '' : 's'}
                        </div>
                        <button
                          type="button"
                          className={styles.repoCopyButton}
                          onClick={() => handleCopyUrls(repo.pullRequests.map((pr) => pr.url))}
                          aria-label={`Copy PR URLs for ${repo.fullName}`}
                          title="Copy PR URLs"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>

                      <div className={styles.repoList}>
                        {visiblePullRequests.map((pullRequest) => (
                          <a
                            key={pullRequest.url}
                            href={pullRequest.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.repoListItem}
                          >
                            <span className={styles.repoListTitle}>
                              <span className={styles.repoListNumber}>PR #{pullRequest.number}</span>
                              {' -  '}
                              {pullRequest.title}
                            </span>
                          </a>
                        ))}
                      </div>

                      {hasMore && (
                        <button
                          type="button"
                          className={styles.repoExpandButton}
                          onClick={() => toggleRepoExpanded(repo.fullName)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Show fewer PRs for ${repo.fullName}` : `Show all PRs for ${repo.fullName}`}
                        >
                          {isExpanded ? (
                            <>
                              Show less <ChevronUp size={14} aria-hidden="true" />
                            </>
                          ) : (
                            <>
                              Show all {repo.pullRequestCount} <ChevronDown size={14} aria-hidden="true" />
                            </>
                          )}
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            )}

            {activeView === 'summary' && (
              <div className={styles.summaryView}>
                <div className={styles.summaryStats}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardLabel}>Merged PRs</div>
                    <div className={styles.summaryCardValue}>{model.summary.mergedPRs}</div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardLabel}>Active Repos</div>
                    <div className={styles.summaryCardValue}>{model.summary.repos}</div>
                  </div>
                </div>

                <section className={styles.summaryLeaderboard} aria-label="Top Repositories">
                  <div className={styles.summaryLeaderboardHeader}>Top Repositories</div>
                  <div className={styles.summaryLeaderboardList}>
                    {model.summary.topRepositories.map((repo, index) => {
                      const repoUrls = repoGrid.find((entry) => entry.fullName === repo.fullName)?.pullRequests.map((pr) => pr.url) ?? []

                      return (
                        <div key={repo.fullName} className={styles.summaryLeaderboardItem}>
                          <span className={styles.summaryRank}>{index + 1}</span>
                          <div className={styles.summaryRepoName}>{repo.fullName}</div>
                          <div className={styles.summaryRepoCount}>{repo.count} PRs</div>
                          <button
                            type="button"
                            className={styles.summaryRepoCopyButton}
                            onClick={() => handleCopyUrls(repoUrls)}
                            aria-label={`Copy PR URLs for ${repo.fullName}`}
                            title="Copy PR URLs"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeView === 'timeline' && selectedMonth && (
              <div className={styles.timeline}>
                <div className={styles.timelineYears} role="group" aria-label="Year">
                  {Array.from(yearTotals, ([year, total]) => (
                    <button
                      key={year}
                      type="button"
                      aria-pressed={year === selectedYear}
                      className={`${styles.timelineYear} ${year === selectedYear ? styles.timelineYearActive : ''}`}
                      onClick={() => selectYear(year)}
                    >
                      {year} · {total}
                    </button>
                  ))}
                </div>

                <div className={styles.timelineBars} role="group" aria-label={`Months in ${selectedYear}`}>
                  {yearMonths.map((month) => {
                    const height = month.count === 0 ? 3 : Math.max(6, (month.count / yearMax) * 100)
                    return (
                      <button
                        key={month.key}
                        type="button"
                        aria-pressed={month.key === selectedMonthKey}
                        aria-label={`${month.short} ${selectedYear}: ${month.count} PR${month.count === 1 ? '' : 's'}`}
                        disabled={month.count === 0}
                        className={`${styles.timelineBar} ${month.key === selectedMonthKey ? styles.timelineBarActive : ''}`}
                        onClick={() => setSelectedMonthKey(month.key)}
                      >
                        <svg className={styles.timelineBarChart} viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">
                          <rect x="0" y={100 - height} width="10" height={height} className={styles.timelineBarFill} />
                        </svg>
                        <span className={styles.timelineBarCount}>{month.count || ''}</span>
                        <span className={styles.timelineBarLabel}>{month.short}</span>
                      </button>
                    )
                  })}
                </div>

                <div className={styles.timelineMonthGroup}>
                  <div className={styles.timelineMonthHeader}>
                    <span className={styles.timelineMonthLabel}>
                      {selectedMonth.label} ({selectedMonth.entries.length})
                    </span>
                    <button
                      type="button"
                      className={styles.timelineMonthCopyButton}
                      onClick={() => handleCopyUrls(selectedMonth.entries.map((entry) => entry.url))}
                      aria-label={`Copy PR URLs for ${selectedMonth.label}`}
                      title="Copy PR URLs"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.timelineMonthBody}>
                    <div className={styles.timelineSpine} data-testid="profile-timeline-spine" aria-hidden="true" />
                    {selectedMonth.entries.map((entry) => (
                      <div key={entry.id} className={styles.timelineItem} data-testid="profile-timeline-item">
                        <div className={styles.timelineRail} aria-hidden="true">
                          <span className={styles.timelineMarker} data-testid="profile-timeline-marker" />
                        </div>
                        <a href={entry.url} target="_blank" rel="noreferrer" className={styles.timelineCard}>
                          <div className={styles.timelineRepo}>{entry.repoFullName}</div>
                          <div className={styles.timelineTitle}>{entry.title}</div>
                          <div className={styles.timelineMeta}>
                            PR #{entry.number} · {formatTimelineDate(entry.mergedAt)}
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {tweetModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Share on Twitter / X">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Share on Twitter / X</div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setTweetModalOpen(false)}
                aria-label="Close tweet modal"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {model.shareVariants.map((variant, index) => (
                <div key={variant} className={styles.tweetCard}>
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopyTweet(variant)}
                    aria-label={`Copy tweet variant ${index + 1}`}
                    title="Copy"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <div className={styles.tweetText}>{variant}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {copyToastVisible && <div className={styles.copiedToast}>Copied to clipboard</div>}
    </section>
  )
}
