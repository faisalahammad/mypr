const DEFAULT_AUTH_REDIRECT_PATH = '/settings'
const ALLOWED_AUTH_REDIRECT_PREFIXES = ['/feed', '/settings']

type RedirectCandidate = string | string[] | null | undefined

export function getSafeAuthRedirectPath(
  candidate?: RedirectCandidate,
  fallback = DEFAULT_AUTH_REDIRECT_PATH
) {
  const resolvedCandidate = Array.isArray(candidate) ? candidate[0] : candidate

  if (!resolvedCandidate) {
    return fallback
  }

  if (!resolvedCandidate.startsWith('/') || resolvedCandidate.startsWith('//')) {
    return fallback
  }

  const [pathname] = resolvedCandidate.split('?')

  if (!ALLOWED_AUTH_REDIRECT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return fallback
  }

  return resolvedCandidate
}

export function appendNextParam(url: string, nextPath: string) {
  const targetUrl = new URL(url)
  const safeNextPath = getSafeAuthRedirectPath(nextPath)

  if (safeNextPath !== DEFAULT_AUTH_REDIRECT_PATH) {
    targetUrl.searchParams.set('next', safeNextPath)
  }

  return targetUrl.toString()
}

export function buildAuthCallbackPath(code: string, nextPath?: RedirectCandidate) {
  const searchParams = new URLSearchParams({ code })
  const safeNextPath = getSafeAuthRedirectPath(nextPath)

  if (safeNextPath !== DEFAULT_AUTH_REDIRECT_PATH) {
    searchParams.set('next', safeNextPath)
  }

  return `/api/auth/callback?${searchParams.toString()}`
}

export { DEFAULT_AUTH_REDIRECT_PATH }
