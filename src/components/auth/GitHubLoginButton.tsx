'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { appendNextParam, getSafeAuthRedirectPath } from '@/lib/auth-redirect'
import { createSupabaseClient } from '@/lib/supabase-client'

type GitHubLoginButtonProps = {
  children: ReactNode
  className?: string
  nextPath?: string | null
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
}

export async function startGitHubOAuth(nextPath?: string | null) {
  const supabase = createSupabaseClient()
  const redirectTo = appendNextParam(
    `${window.location.origin}/api/auth/callback`,
    getSafeAuthRedirectPath(nextPath)
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
    },
  })

  if (error) {
    throw error
  }

  if (data?.url) {
    window.location.assign(data.url)
  }
}

export function GitHubLoginButton({
  children,
  className,
  nextPath,
  size = 'default',
  variant = 'default',
}: GitHubLoginButtonProps) {
  const handleClick = async () => {
    try {
      await startGitHubOAuth(nextPath)
    } catch {
      // Keep the failure local to the button. The login page remains available for retry.
    }
  }

  return (
    <Button className={className} onClick={handleClick} size={size} variant={variant}>
      {children}
    </Button>
  )
}
