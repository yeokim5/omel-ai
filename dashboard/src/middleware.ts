/**
 * Next.js Middleware
 * 
 * Runs on every request to handle authentication.
 * Delegates to the Supabase middleware helper for session management.
 * 
 * The matcher config excludes static files and images from processing.
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Only run middleware on non-static routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
