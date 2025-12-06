import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get user's dealership
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user?.id)
    .single()

  const dealershipId = profile?.dealership_id

  // Get stats
  const { count: totalScans } = await supabase
    .from('guard_logs')
    .select('*', { count: 'exact', head: true })
    .eq('dealership_id', dealershipId)

  const { count: blockedCount } = await supabase
    .from('guard_logs')
    .select('*', { count: 'exact', head: true })
    .eq('dealership_id', dealershipId)
    .eq('type', 'block')

  // Get recent activity
  const { data: recentLogs } = await supabase
    .from('guard_logs')
    .select('*')
    .eq('dealership_id', dealershipId)
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    { name: 'Chats Scanned', value: totalScans?.toLocaleString() || '0', icon: '💬' },
    { name: 'Threats Blocked', value: blockedCount?.toString() || '0', icon: '🛡️' },
  ]

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here&apos;s your protection overview.</p>
      </div>

      {/* Stats Grid */}
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

      {/* Activity Feed */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  log.type === 'block' 
                    ? 'bg-red-500/10 text-red-400' 
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {log.type === 'block' ? '🚫' : '✓'}
                </div>
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
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-slate-400">No activity yet</p>
            <p className="text-sm text-slate-500 mt-1">Logs will appear here when guard.js starts monitoring</p>
          </div>
        )}
      </div>
    </div>
  )
}
