'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { ActivityDayPR } from '@/lib/profile-results'
import { cn } from '@/lib/utils'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS = 53
const MAX_TOOLTIP_TITLES = 3
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const ARROW_STEPS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }

export interface ActivityDay {
  key: string
  prs: ActivityDayPR[]
  future: boolean
}

export interface ActivityStats {
  total: number
  activeDays: number
  longestStreak: number
  busiest: ActivityDay | null
}

function levelClass(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-primary/30'
  if (count <= 3) return 'bg-primary/60'
  return 'bg-primary'
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** "2026-10-22" -> "October 22nd" */
export function formatActivityDate(key: string): string {
  const date = new Date(`${key}T00:00:00Z`)
  const day = date.getUTCDate()
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'
  return `${date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${day}${suffix}`
}

/** 53 week columns x 7 weekday rows (Sunday first), ending this week (UTC). */
export function buildActivityDays(activity: Record<string, ActivityDayPR[]>, now = new Date()): ActivityDay[] {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const start = todayUtc - (now.getUTCDay() + (WEEKS - 1) * 7) * DAY_MS
  const days: ActivityDay[] = []
  for (let time = start; time < start + WEEKS * 7 * DAY_MS; time += DAY_MS) {
    const key = new Date(time).toISOString().slice(0, 10)
    days.push({ key, prs: activity[key] ?? [], future: time > todayUtc })
  }
  return days
}

export function getActivityStats(days: ActivityDay[]): ActivityStats {
  let total = 0
  let activeDays = 0
  let longestStreak = 0
  let streak = 0
  let busiest: ActivityDay | null = null

  for (const day of days) {
    if (day.future) break
    const count = day.prs.length
    total += count
    streak = count > 0 ? streak + 1 : 0
    longestStreak = Math.max(longestStreak, streak)
    if (count > 0) activeDays += 1
    if (count > 0 && count >= (busiest?.prs.length ?? 0)) busiest = day
  }

  return { total, activeDays, longestStreak, busiest }
}

function getMonthLabels(days: ActivityDay[]): string[] {
  let previous = ''
  return Array.from({ length: WEEKS }, (_, week) => {
    const month = new Date(`${days[week * 7].key}T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    // Skip a label in the last two columns, where it would overflow the grid
    if (month === previous || week > WEEKS - 3) return ''
    previous = month
    return month
  })
}

function ActivityTooltip({ day, index }: { day: ActivityDay; index: number }) {
  const week = Math.floor(index / 7)
  const row = index % 7
  const count = day.prs.length

  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute z-20 grid w-max max-w-[260px] gap-1 rounded-md bg-foreground px-2.5 py-1.5 text-left text-xs text-background shadow-lg',
        // Top rows open below so the tooltip stays inside the card
        row < 3 ? 'top-full mt-2' : 'bottom-full mb-2',
        week < 5 ? 'left-0' : week > WEEKS - 6 ? 'right-0' : 'left-1/2 -translate-x-1/2'
      )}
    >
      <span className="whitespace-nowrap">
        <span className="font-semibold">{count === 0 ? 'No PRs' : plural(count, 'PR')}</span> on {formatActivityDate(day.key)}
      </span>
      {day.prs.slice(0, MAX_TOOLTIP_TITLES).map((pr) => (
        <span key={pr.number} className="truncate opacity-80">
          #{pr.number} {pr.title}
        </span>
      ))}
      {count > MAX_TOOLTIP_TITLES ? <span className="opacity-80">+{count - MAX_TOOLTIP_TITLES} more</span> : null}
    </span>
  )
}

export function ActivityGrid({ activity }: { activity: Record<string, ActivityDayPR[]> }) {
  const days = useMemo(() => buildActivityDays(activity), [activity])
  const stats = useMemo(() => getActivityStats(days), [days])
  const monthLabels = useMemo(() => getMonthLabels(days), [days])
  // Future days only trail the grid, so the last past day sits right before them
  const lastIndex = days.filter((day) => !day.future).length - 1
  const gridRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(lastIndex)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = focusIndex + step
    if (next < 0 || next > lastIndex) return
    setFocusIndex(next)
    gridRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus()
  }

  const statItems = [
    { label: 'PRs in the last year', value: stats.total.toLocaleString('en') },
    { label: 'active days', value: stats.activeDays.toLocaleString('en') },
    { label: 'longest streak', value: plural(stats.longestStreak, 'day') },
    {
      label: stats.busiest ? `busiest · ${formatActivityDate(stats.busiest.key)}` : 'busiest day',
      value: stats.busiest ? plural(stats.busiest.prs.length, 'PR') : '-',
    },
  ]

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statItems.map((item) => (
          <div key={item.label} className="grid rounded-xl border border-border px-3 py-2">
            <dd className="text-base font-semibold tabular-nums text-foreground">{item.value}</dd>
            <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto pb-1 sm:overflow-visible">
        <div className="grid min-w-[640px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1">
          <span aria-hidden="true" />
          <div className="grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[3px] text-[11px] text-muted-foreground" aria-hidden="true">
            {monthLabels.map((label, week) => (
              <span key={week} className="whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 gap-[3px] text-[10px] text-muted-foreground" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, row) => (
              <span key={row} className="flex items-center">
                {label}
              </span>
            ))}
          </div>
          <div
            ref={gridRef}
            role="group"
            aria-label={`${plural(stats.total, 'merged pull request')} in the last year. Use arrow keys to move between days.`}
            className="grid grid-flow-col grid-cols-[repeat(53,minmax(0,1fr))] grid-rows-7 gap-[3px]"
            onKeyDown={handleKeyDown}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {days.map((day, index) =>
              day.future ? (
                <span key={day.key} aria-hidden="true" className="aspect-square" />
              ) : (
                <span
                  key={day.key}
                  role="img"
                  data-index={index}
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-label={`${day.prs.length === 0 ? 'No PRs' : plural(day.prs.length, 'PR')} on ${formatActivityDate(day.key)}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => {
                    setActiveIndex(index)
                    setFocusIndex(index)
                  }}
                  onBlur={() => setActiveIndex(null)}
                  className={cn(
                    'relative aspect-square rounded-[3px] outline-none hover:z-10 hover:ring-2 hover:ring-foreground/70 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring',
                    levelClass(day.prs.length)
                  )}
                >
                  {activeIndex === index ? <ActivityTooltip day={day} index={index} /> : null}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground" aria-hidden="true">
        Less
        {[0, 1, 2, 4].map((count) => (
          <span key={count} className={cn('h-[11px] w-[11px] rounded-[2px]', levelClass(count))} />
        ))}
        More
      </div>
    </div>
  )
}
