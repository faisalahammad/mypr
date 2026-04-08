'use client'

import { useEffect, useRef, useState } from 'react'

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

const MODEL_CACHE_PREFIX = 'mypr.profile-results:'
const VIEW_CACHE_PREFIX = 'mypr.profile-results-view:'

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
  const [cachedModel, setCachedModel] = useState<ProfileResultsModel>(model)

  useEffect(() => {
    const modelKey = `${MODEL_CACHE_PREFIX}${model.identity.username}`
    const viewKey = `${VIEW_CACHE_PREFIX}${model.identity.username}`

    try {
      const stored = window.sessionStorage.getItem(modelKey)
      if (stored) {
        const parsed = JSON.parse(stored) as ProfileResultsModel
        if (parsed.identity.username === model.identity.username) {
          setCachedModel(parsed)
        }
      }
    } catch {
      setCachedModel(model)
    }

    window.sessionStorage.setItem(modelKey, JSON.stringify(model))
    window.sessionStorage.setItem(viewKey, 'repos')
    setCachedModel(model)
    setActiveView('repos')
  }, [model])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(`${VIEW_CACHE_PREFIX}${cachedModel.identity.username}`, activeView)
    } catch {
      // Ignore storage failures.
    }
  }, [activeView, cachedModel.identity.username])

  const handleScreenshot = async () => {
    if (!previewCardRef.current) return

    setIsDownloading(true)

    try {
      await downloadAsImage(
        previewCardRef.current,
        getCaptureFilename(cachedModel.identity.username, activeView),
        activeView === 'timeline'
          ? { backgroundColor: '#161b22', maxHeight: 2200 }
          : { backgroundColor: '#161b22' }
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

  return (
    <section className={styles.root} aria-label="Profile results">
      <div className={styles.inner}>
        <div className={styles.resultsHeader}>
          <div className={styles.userInfo}>
            {cachedModel.identity.avatarUrl ? (
              <img
                src={cachedModel.identity.avatarUrl}
                alt={cachedModel.identity.displayName}
                className={styles.userAvatar}
              />
            ) : (
              <span className={styles.userAvatarFallback} aria-hidden="true">
                {cachedModel.identity.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <div className={styles.userName}>{cachedModel.identity.displayName}</div>
              <div className={styles.userMeta}>
                @{cachedModel.identity.username} · {cachedModel.counts.mergedPRs} merged PRs · {cachedModel.counts.repos} repos
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
                {cachedModel.repoGrid.map((repo) => (
                  <article key={repo.fullName} className={styles.repoCard}>
                    <div className={styles.repoHeader}>
                      <div className={styles.repoIcon}>📁</div>
                      <div>
                        <div className={styles.repoName}>{repo.name}</div>
                        <div className={styles.repoOrg}>{repo.org}</div>
                      </div>
                    </div>

                    <div className={styles.repoCount}>
                      {repo.pullRequestCount} merged PR{repo.pullRequestCount === 1 ? '' : 's'}
                    </div>

                    <div className={styles.repoList}>
                      {repo.pullRequests.slice(0, 3).map((pullRequest) => (
                        <a
                          key={pullRequest.url}
                          href={pullRequest.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.repoListItem}
                        >
                          <div className={styles.repoListTitle}>{pullRequest.title}</div>
                          <div className={styles.repoListMeta}>PR #{pullRequest.number}</div>
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeView === 'summary' && (
              <div className={styles.summaryView}>
                <div className={styles.summaryStats}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardLabel}>Merged PRs</div>
                    <div className={styles.summaryCardValue}>{cachedModel.summary.mergedPRs}</div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryCardLabel}>Active Repos</div>
                    <div className={styles.summaryCardValue}>{cachedModel.summary.repos}</div>
                  </div>
                </div>

                <section className={styles.summaryLeaderboard} aria-label="Top Repositories">
                  <div className={styles.summaryLeaderboardHeader}>Top Repositories</div>
                  <div className={styles.summaryLeaderboardList}>
                    {cachedModel.summary.topRepositories.map((repo, index) => (
                      <div key={repo.fullName} className={styles.summaryLeaderboardItem}>
                        <span className={styles.summaryRank}>{index + 1}</span>
                        <div className={styles.summaryRepoName}>{repo.fullName}</div>
                        <div className={styles.summaryRepoCount}>{repo.count} PRs</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeView === 'timeline' && (
              <div className={styles.timeline}>
                {cachedModel.timeline.map((entry) => (
                  <div key={entry.id} className={styles.timelineItem}>
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
              {cachedModel.shareVariants.map((variant, index) => (
                <div key={variant} className={styles.tweetCard}>
                  <div className={styles.tweetText}>{variant}</div>
                  <div className={styles.tweetActions}>
                    <button
                      type="button"
                      className={styles.copyButton}
                      onClick={() => handleCopyTweet(variant)}
                      aria-label={`Copy tweet variant ${index + 1}`}
                    >
                      Copy
                    </button>
                  </div>
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
