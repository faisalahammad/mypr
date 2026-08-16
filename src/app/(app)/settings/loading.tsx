import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading state for the settings page
 *
 * Shows skeleton placeholders while the settings data is being fetched.
 * This automatically displays when navigating to the settings page.
 */
export default function SettingsLoading() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Page header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Account section skeleton */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-5 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      {/* Repos section skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border bg-card p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}