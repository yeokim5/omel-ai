/**
 * Sidebar Component
 * 
 * Navigation sidebar for the Omel AI dashboard with:
 * - Logo and branding
 * - System status indicator
 * - Navigation links
 * - User info and sign out
 * 
 * Includes both desktop sidebar and mobile header variants.
 */

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Navigation items for the sidebar
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Alerts', href: '/dashboard/alerts', icon: '🚨' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
]

interface SidebarProps {
  user: User
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Sign out and redirect to login
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-800 border-r border-slate-700 px-6 pb-4">
          
          {/* Logo Section */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-700">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-xl">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Omel AI</h1>
              <p className="text-xs text-slate-400">Protection Dashboard</p>
            </div>
          </div>

          {/* System Status Badge */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">System Active</p>
                <p className="text-xs text-slate-400">Protection Mode</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition ${
                      pathname === item.href
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* User Section */}
            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-slate-300 text-sm font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-slate-400">Admin</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
              >
                <span>🚪</span>
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Header - Shown only on mobile */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-slate-800 px-4 py-4 shadow-sm lg:hidden border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-lg font-bold text-white">Omel AI</h1>
        </div>
      </div>
    </>
  )
}
