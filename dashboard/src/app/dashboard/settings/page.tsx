'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dealershipId, setDealershipId] = useState<string | null>(null)
  
  const [mode, setMode] = useState<'protection' | 'monitor'>('protection')
  const [dealershipName, setDealershipName] = useState('')
  const [phone, setPhone] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single()

      if (!profile?.dealership_id) {
        setLoading(false)
        return
      }

      setDealershipId(profile.dealership_id)

      const { data: dealership } = await supabase
        .from('dealerships')
        .select('name')
        .eq('id', profile.dealership_id)
        .single()

      if (dealership) {
        setDealershipName(dealership.name)
      }

      const { data: config } = await supabase
        .from('configurations')
        .select('*')
        .eq('dealership_id', profile.dealership_id)
        .single()

      if (config) {
        setMode(config.mode || 'protection')
        setPhone(config.phone || '')
      }

      setLoading(false)
    }

    loadSettings()
  }, [supabase])

  const handleSave = async () => {
    if (!dealershipId) return
    
    setSaving(true)
    
    await supabase
      .from('dealerships')
      .update({ name: dealershipName })
      .eq('id', dealershipId)

    const { data: existingConfig } = await supabase
      .from('configurations')
      .select('id')
      .eq('dealership_id', dealershipId)
      .single()

    if (existingConfig) {
      await supabase
        .from('configurations')
        .update({ mode, phone })
        .eq('dealership_id', dealershipId)
    } else {
      await supabase
        .from('configurations')
        .insert({ dealership_id: dealershipId, mode, phone })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!dealershipId) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
        <span className="text-4xl mb-4 block">⚠️</span>
        <p className="text-yellow-400 font-medium">No dealership linked</p>
        <p className="text-sm text-slate-400 mt-2">Contact support to link your account.</p>
      </div>
    )
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
            <p className="text-sm text-slate-400 text-left">Block dangerous responses</p>
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
            <p className="text-sm text-slate-400 text-left">Log without blocking</p>
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
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-xl transition"
      >
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
