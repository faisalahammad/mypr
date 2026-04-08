type SupabaseCookie = {
  name: string
  value: string
  options?: Record<string, unknown>
}

type CookieCapableRequest = Request | {
  cookies?: {
    set?: (name: string, value: string) => void
  }
}

type ResponseWithCookies = {
  cookies: {
    set: (name: string, value: string, options?: Record<string, unknown>) => void
  }
}

export function applySupabaseCookies(
  request: CookieCapableRequest,
  response: ResponseWithCookies,
  cookiesToSet: SupabaseCookie[]
) {
  const requestCookies = (request as { cookies?: { set?: (name: string, value: string) => void } }).cookies

  cookiesToSet.forEach(({ name, value, options }) => {
    try {
      requestCookies?.set?.(name, value)
    } catch {
      // Ignore request cookie mutation failures outside middleware/route contexts.
    }

    response.cookies.set(name, value, options)
  })
}
