import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase'

export default async function HomePage() {
  // Redirect authenticated users straight to their feed
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/feed')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center text-center gap-10">
        {/* Logo / wordmark */}
        <div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            mypr.pro.bd
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            A public portfolio for your merged pull requests.
            Showcase the work you&apos;re proud of, follow engineers you admire.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          {[
            '✦ Auto-synced from GitHub',
            '✦ Public profile timeline',
            '✦ Follow developers',
            '✦ Download PR cards',
          ].map((f) => (
            <span
              key={f}
              className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <a
          href="/login"
          className="inline-flex items-center gap-3 rounded-xl bg-gray-900 dark:bg-white px-8 py-4 text-base font-semibold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          Continue with GitHub
        </a>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Public profiles are visible without signing in.
        </p>
      </div>
    </div>
  )
}
