/**
 * Home Page (Root Route)
 * 
 * This page handles the initial routing:
 * - If user is logged in → redirect to /dashboard
 * - If user is not logged in → redirect to /login
 * 
 * Users never actually see this page - it's just a router.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
