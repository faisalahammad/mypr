import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading state for the feed page
 *
 * Shows skeleton placeholders while the feed data is being fetched.
 * This automatically displays when navigating to the feed page.
 */
export default function FeedLoading() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Page header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Timeline skeleton */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />

        {/* PR card skeletons */}
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="relative pl-12">
              {/* Dot on the line */}
              <div
                className="absolute left-[19px] top-6 w-3 h-3 rounded-full bg-muted border-2 border-background"
                aria-hidden="true"
              />

              {/* Card skeleton */}
              <div className="rounded-lg border bg-card p-6 space-y-3">
                {/* Title skeleton */}
                <Skeleton className="h-6 w-3/4" />

                {/* Repo badge skeleton */}
                <Skeleton className="h-5 w-32" />

                {/* Stats skeleton */}
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>

                {/* Date skeleton */}
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
