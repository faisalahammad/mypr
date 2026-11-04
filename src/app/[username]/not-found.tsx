import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find a user with that username. Check the spelling or try searching for another developer.
          </p>
          <div className="flex justify-center gap-2">
            <Link href="/explore" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Search developers
            </Link>
            <Link href="/" className="inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
