'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { downloadAsImage } from '@/lib/utils'
import {
  getProfileResultsPreviewLabel,
  type ProfileResultsModel,
  type ProfileResultsView,
} from '@/lib/profile-results'
import styles from './ProfileResults.module.css'

interface ProfileResultsProps {
  model: ProfileResultsModel
}

function formatTimelineDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getCaptureFilename(username: string, view: ProfileResultsView): string {
  const slug = view === 'summary' ? 'summary-stats' : view === 'timeline' ? 'timeline' : 'repo-grid'
  return `${username}-${slug}.png`
}

export function ProfileResults({ model }: ProfileResultsProps) {
  const previewCardRef = useRef<HTMLDivElement>(null)
  const [activeView, setActiveView] = useState<ProfileResultsView>('repos')
  const [tweetModalOpen, setTweetModalOpen] = useState(false)
  const [copyToastVisible, setCopyToastVisible] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({})

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

  return (
    <section className={styles.root} aria-label="Profile results">
      <div className={styles.inner}>
        <div className={styles.resultsHeader}>
          <div className={styles.userInfo}>
            {model.identity.avatarUrl ? (
              <img
                src={model.identity.avatarUrl}
                alt={model.identity.displayName}
                className={styles.userAvatar}
              />
            ) : (
              <span className={styles.userAvatarFallback} aria-hidden="true">
                {model.identity.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <div className={styles.userName}>{model.identity.displayName}</div>
              <div className={styles.userMeta}>
                @{model.identity.username} · {model.counts.mergedPRs} merged PRs · {model.counts.repos} repos
              </div>
            </div>
          </div>

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
              {isDownloading ? 'Capturing…' : 'Screenshot'}
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
                {model.repoGrid.map((repo) => {
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
                      const repoUrls = model.repoGrid.find((entry) => entry.fullName === repo.fullName)?.pullRequests.map((pr) => pr.url) ?? []

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

            {activeView === 'timeline' && (
              <div className={styles.timeline}>
                {model.timelineByMonth.map((month) => (
                  <div key={month.key} className={styles.timelineMonthGroup}>
                    <div className={styles.timelineMonthHeader}>
                      <span className={styles.timelineMonthLabel}>
                        {month.label} ({month.entries.length})
                      </span>
                      <button
                        type="button"
                        className={styles.timelineMonthCopyButton}
                        onClick={() => handleCopyUrls(month.entries.map((entry) => entry.url))}
                        aria-label={`Copy PR URLs for ${month.label}`}
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
                      {month.entries.map((entry) => (
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
                ))}
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
