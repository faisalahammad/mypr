export function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="animate-pulse border-t border-border py-4 first:border-t-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-3 h-6 w-24 rounded-full bg-muted" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
          <div className="mt-3 flex gap-2">
            {[0, 1, 2, 3, 4].map((button) => (
              <div key={button} className="h-10 w-16 rounded-full bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
