/**
 * Dashboard Home Page
 * 
 * Displays:
 * - Overview stats (chats scanned, threats blocked)
 * - Recent activity feed showing guard.js logs
 * 
 * Data is fetched from Supabase based on the user's linked dealership.
 */

import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get user's linked dealership
  const { data: { user } } = await supabase.auth.getUser()
  
  // Early return if user is not authenticated
  // This shouldn't happen due to layout protection, but provides defense in depth
  if (!user || !user.id) {
    console.error('DashboardPage: No authenticated user found')
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Authentication error. Please log in again.</p>
      </div>
    )
  }
  
  // Use maybeSingle() to handle missing profiles gracefully
  // single() throws an error when no rows are found, which would cause silent failures
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
  }

  const dealershipId = profile?.dealership_id

  // Early return if no dealership is linked - prevents queries with undefined dealershipId
  // This matches the pattern used in the settings page for consistency
  if (!dealershipId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back!</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
          <span className="text-4xl mb-4 block">⚠️</span>
          <p className="text-yellow-400 font-medium">No dealership linked</p>
          <p className="text-sm text-slate-400 mt-2">Contact support to link your account to a dealership.</p>
        </div>
      </div>
    )
  }

  // Fetch stats: total scans
  const { count: totalScans } = await supabase
    .from('guard_logs')
    .select('*', { count: 'exact', head: true })
    .eq('dealership_id', dealershipId)

  // Fetch stats: blocked count
  const { count: blockedCount } = await supabase
    .from('guard_logs')
    .select('*', { count: 'exact', head: true })
    .eq('dealership_id', dealershipId)
    .eq('type', 'block')

  // Fetch recent activity (last 10 logs)
  const { data: recentLogs } = await supabase
    .from('guard_logs')
    .select('*')
    .eq('dealership_id', dealershipId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Stats cards configuration
  const stats = [
    { name: 'Chats Scanned', value: totalScans?.toLocaleString() || '0', icon: '💬' },
    { name: 'Threats Blocked', value: blockedCount?.toString() || '0', icon: '🛡️' },
  ]

  /**
   * Format timestamp to relative time (e.g., "5 min ago")
   */
  function formatTime(timestamp: string) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here&apos;s your protection overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
          >
            <span className="text-3xl">{stat.icon}</span>
            <p className="mt-4 text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-slate-400">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        
        {recentLogs && recentLogs.length > 0 ? (
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl"
              >
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  log.type === 'block' 
                    ? 'bg-red-500/10 text-red-400' 
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {log.type === 'block' ? '🚫' : '✓'}
                </div>
                
                {/* Log Details */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {log.type === 'block' ? 'Blocked: ' : 'Passed: '}
                    {log.reason || 'Message evaluated'}
                  </p>
                  <span className="text-xs text-slate-400">{formatTime(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-slate-400">No activity yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Logs will appear here when guard.js starts monitoring
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
