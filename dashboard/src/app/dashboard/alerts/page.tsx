/**
 * Alerts Page
 * 
 * Displays all blocked messages from guard.js:
 * - Shows what the user asked
 * - Shows the blocked bot response
 * - Shows the reason it was blocked
 * - Shows the timestamp
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Format timestamp to readable date/time
 */
function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default async function AlertsPage() {
  const supabase = await createClient()
  
  // Get user's linked dealership
  const { data: { user } } = await supabase.auth.getUser()
  
  // Early return if user is not authenticated
  // This shouldn't happen due to layout protection, but provides defense in depth
  if (!user || !user.id) {
    console.error('AlertsPage: No authenticated user found')
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
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 mt-1">Review blocked threats</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
          <span className="text-4xl mb-4 block">⚠️</span>
          <p className="text-yellow-400 font-medium">No dealership linked</p>
          <p className="text-sm text-slate-400 mt-2">Contact support to link your account to a dealership.</p>
        </div>
      </div>
    )
  }

  // Fetch blocked messages (last 50)
  const { data: alerts } = await supabase
    .from('guard_logs')
    .select('*')
    .eq('dealership_id', dealershipId)
    .eq('type', 'block')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get total blocked count
  const { count: blockedCount } = await supabase
    .from('guard_logs')
    .select('*', { count: 'exact', head: true })
    .eq('dealership_id', dealershipId)
    .eq('type', 'block')

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-slate-400 mt-1">Review blocked threats</p>
      </div>

      {/* Stats Badge */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 inline-block">
        <p className="text-2xl font-bold text-red-400">{blockedCount || 0}</p>
        <p className="text-sm text-red-300">Total Blocked</p>
      </div>

      {/* Alerts List */}
      {alerts && alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
            >
              <div className="flex items-start gap-4">
                {/* Block Icon */}
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-xl">🚫</span>
                </div>
                
                <div className="flex-1">
                  {/* User's Question (if available) */}
                  {alert.user_message && (
                    <div className="bg-slate-900/50 rounded-xl p-3 mb-2">
                      <p className="text-xs text-slate-500 mb-1">User asked:</p>
                      <p className="text-sm text-slate-300">{alert.user_message}</p>
                    </div>
                  )}
                  
                  {/* Blocked Bot Response */}
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-2">
                    <p className="text-xs text-red-400 mb-1">Bot response (blocked):</p>
                    <p className="text-sm text-white">{alert.bot_message}</p>
                  </div>
                  
                  {/* Footer: Reason and Timestamp */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-500">Reason:</span> {alert.reason}
                    </p>
                    <p className="text-xs text-slate-500">{formatTime(alert.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state - no blocked messages
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
          <span className="text-4xl mb-4 block">🎉</span>
          <p className="text-white font-medium">No threats blocked</p>
          <p className="text-sm text-slate-400 mt-1">Your chatbot is behaving well!</p>
        </div>
      )}
    </div>
  )
}
