import { Skeleton } from '@/components/ui/skeleton'

/**
 * Fallback loading state for routes without their own loading.tsx
 * (home, explore, about, changelog). Lets navigation switch instantly
 * instead of freezing on the old page while the server renders.
 */
export default function RootLoading() {
  return (
    <div className="container max-w-3xl mx-auto py-10 px-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56 mb-3" />
      <Skeleton className="h-5 w-80 mb-8" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
