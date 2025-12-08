/**
 * Auth Callback Route
 * 
 * Handles OAuth callbacks and email confirmation links from Supabase.
 * Exchanges the auth code for a session and redirects to the dashboard.
 * 
 * This route is called when:
 * - User confirms their email
 * - User logs in via OAuth provider
 * - User clicks magic link
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Validate that a redirect path is safe (relative path only, no external redirects)
 * Prevents open redirect attacks where attackers craft URLs like ?next=//attacker.com
 */
function getSafeRedirectPath(next: string | null): string {
  const defaultPath = '/dashboard'
  
  if (!next) return defaultPath
  
  // Must start with exactly one forward slash (relative path)
  // Reject: "//attacker.com", "https://", "http://", or any protocol
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    return defaultPath
  }
  
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getSafeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to login with error if code exchange fails
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
