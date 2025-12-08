/**
 * Supabase Middleware
 * 
 * Handles session management and authentication redirects:
 * - Refreshes auth tokens on each request
 * - Redirects unauthenticated users from /dashboard to /login
 * - Redirects authenticated users from /login to /dashboard
 * - Allows access to /reset-password for password recovery
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create a response object that we can modify
  let supabaseResponse = NextResponse.next({ request })

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update cookies on the request
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Create new response with updated cookies
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get current user (also refreshes session)
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login page
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Allow access to reset-password page (user arrives via email link with session)
  if (request.nextUrl.pathname === '/reset-password') {
    return supabaseResponse
  }

  return supabaseResponse
}
