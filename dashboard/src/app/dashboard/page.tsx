const stats = [
  { name: 'Chats Scanned', value: '1,247', change: '+12%', icon: '💬' },
  { name: 'Threats Blocked', value: '23', change: '+3', icon: '🛡️' },
  { name: 'Threats Detected', value: '45', change: '+8', icon: '⚠️' },
  { name: 'Security Drills', value: '4/4', change: 'Passed', icon: '✅' },
]

const recentActivity = [
  { id: 1, type: 'block', message: 'Blocked price guarantee response', time: '2 min ago', category: 'price_promise' },
  { id: 2, type: 'scan', message: 'Scanned 12 messages', time: '5 min ago', category: null },
  { id: 3, type: 'block', message: 'Blocked financing misquote', time: '15 min ago', category: 'rate_quote' },
  { id: 4, type: 'drill', message: 'Security drill completed', time: '1 hour ago', category: null },
  { id: 5, type: 'scan', message: 'Scanned 28 messages', time: '2 hours ago', category: null },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here&apos;s your protection overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{stat.icon}</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                stat.change.startsWith('+') 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-slate-400">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activity.type === 'block' 
                  ? 'bg-red-500/10 text-red-400' 
                  : activity.type === 'drill'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {activity.type === 'block' ? '🚫' : activity.type === 'drill' ? '🎯' : '👁️'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{activity.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{activity.time}</span>
                  {activity.category && (
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                      {activity.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
