import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Custom 404 page for unknown usernames
 * Shown when a profile doesn't exist in the database
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          {/* Icon */}
          <div className="text-6xl mb-4">🔍</div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            User Not Found
          </h1>

          {/* Message */}
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find a user with that username. Check the spelling or try searching for another developer.
          </p>

          {/* Action Button */}
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Back to Home
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
