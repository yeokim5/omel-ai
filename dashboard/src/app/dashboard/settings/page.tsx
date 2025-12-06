'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [mode, setMode] = useState<'protection' | 'monitor'>('protection')
  const [dealershipName, setDealershipName] = useState('Koons Motors')
  const [phone, setPhone] = useState('(555) 123-4567')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your protection settings</p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Protection Mode</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('protection')}
            className={`p-4 rounded-xl border-2 transition ${
              mode === 'protection'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🛡️</span>
              <span className="font-semibold text-white">Protection</span>
            </div>
            <p className="text-sm text-slate-400 text-left">
              Block dangerous responses
            </p>
          </button>
          <button
            onClick={() => setMode('monitor')}
            className={`p-4 rounded-xl border-2 transition ${
              mode === 'monitor'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">👁️</span>
              <span className="font-semibold text-white">Monitor</span>
            </div>
            <p className="text-sm text-slate-400 text-left">
              Log without blocking
            </p>
          </button>
        </div>
      </div>

      {/* Dealership Info */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Dealership Info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={dealershipName}
              onChange={(e) => setDealershipName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition"
      >
        {saved ? '✓ Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
