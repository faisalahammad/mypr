import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading state for the public profile page
 *
 * Shows skeleton placeholders while the profile and PR timeline are fetched.
 * This automatically displays when navigating to a profile page.
 */
export default function ProfileLoading() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Profile header skeleton */}
      <div className="mb-10 flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-6 w-8 mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* PR timeline skeleton */}
      <div className="relative space-y-6">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />

        {[...Array(5)].map((_, i) => (
          <div key={i} className="relative pl-12">
            {/* Dot on the line */}
            <div
              className="absolute left-[19px] top-6 w-3 h-3 rounded-full bg-muted border-2 border-background"
              aria-hidden="true"
            />

            {/* Card skeleton */}
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}