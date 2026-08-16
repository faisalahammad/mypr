import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSafeAuthRedirectPath } from '@/lib/auth-redirect'
import { applySupabaseCookies } from '@/lib/supabase-cookie-bridge'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const pathname = requestUrl.pathname
  const requestedPath = `${pathname}${requestUrl.search}`
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll()
          return cookies.map(({ name, value }) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          applySupabaseCookies(request, response, cookiesToSet)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/feed', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Public routes that should redirect to feed if authenticated
  const isPublicRoute = pathname === '/login'

  // Short-circuit non-auth paths - no Supabase auth network call
  if (!isProtectedRoute && !isPublicRoute) {
    return response
  }

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', getSafeAuthRedirectPath(requestedPath))
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from login to the requested member page
  if (isPublicRoute && user) {
    const redirectPath = getSafeAuthRedirectPath(requestUrl.searchParams.get('redirect'))
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
