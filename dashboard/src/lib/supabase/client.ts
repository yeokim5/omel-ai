/**
 * Supabase Client (Browser)
 * 
 * Creates a Supabase client for use in client-side components.
 * This client runs in the browser and uses the anon key.
 * 
 * Usage:
 *   const supabase = createClient()
 *   const { data } = await supabase.from('table').select()
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
