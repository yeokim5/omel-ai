const alerts = [
  {
    id: 1,
    type: 'block',
    severity: 'high',
    category: 'price_promise',
    originalMessage: "Sure, I can guarantee you'll get $8,000 for your trade-in!",
    userMessage: "Can you guarantee a price for my trade-in?",
    reason: "Contains specific price guarantee for trade-in value",
    timestamp: '2024-12-05T14:32:00Z',
    reviewed: false,
  },
  {
    id: 2,
    type: 'block',
    severity: 'high',
    category: 'rate_quote',
    originalMessage: "We're offering 0% APR on all vehicles this month!",
    userMessage: "What financing rates do you have?",
    reason: "Promises specific APR rate without verification",
    timestamp: '2024-12-05T13:15:00Z',
    reviewed: false,
  },
]

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

export default function AlertsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-slate-400 mt-1">Review blocked and detected threats</p>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-xl">🚫</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">
                    {alert.category}
                  </span>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-2">
                  <p className="text-xs text-red-400 mb-1">Bot response (blocked):</p>
                  <p className="text-sm text-white">{alert.originalMessage}</p>
                </div>
                <p className="text-xs text-slate-400">{formatTime(alert.timestamp)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
