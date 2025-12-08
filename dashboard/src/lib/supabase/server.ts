/**
 * Supabase Client (Server)
 * 
 * Creates a Supabase client for use in server components and API routes.
 * This client has access to cookies for session management.
 * 
 * Usage:
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Get all cookies for authentication
        getAll() {
          return cookieStore.getAll()
        },
        // Set cookies (may fail in Server Components, which is expected)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll was called from a Server Component - this is expected
          }
        },
      },
    }
  )
}
