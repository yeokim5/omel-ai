/**
 * Settings Page
 * 
 * Allows users to configure:
 * - Protection Mode (block dangerous responses vs. monitor only)
 * - Dealership Info (name and phone number)
 * 
 * Settings are saved to Supabase and used by guard.js.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Data state
  const [dealershipId, setDealershipId] = useState<string | null>(null)
  const [mode, setMode] = useState<'protection' | 'monitor'>('protection')
  const [dealershipName, setDealershipName] = useState('')
  const [phone, setPhone] = useState('')

  // Create supabase client once and memoize to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), [])

  /**
   * Load settings from Supabase on mount
   */
  useEffect(() => {
    async function loadSettings() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user's linked dealership (use maybeSingle to handle missing profile gracefully)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('dealership_id')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setLoading(false)
          return
        }

        if (!profile?.dealership_id) {
          setLoading(false)
          return
        }

        setDealershipId(profile.dealership_id)

        // Fetch dealership name (use maybeSingle in case dealership was deleted)
        const { data: dealership } = await supabase
          .from('dealerships')
          .select('name')
          .eq('id', profile.dealership_id)
          .maybeSingle()

        if (dealership) {
          setDealershipName(dealership.name)
        }

        // Fetch configuration (use maybeSingle since config may not exist yet)
        const { data: config } = await supabase
          .from('configurations')
          .select('*')
          .eq('dealership_id', profile.dealership_id)
          .maybeSingle()

        if (config) {
          setMode(config.mode || 'protection')
          setPhone(config.phone || '')
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [supabase])

  /**
   * Save settings to Supabase
   */
  const handleSave = async () => {
    if (!dealershipId) return
    
    setSaving(true)
    let hasError = false
    
    try {
      // Update dealership name
      const { error: dealershipError } = await supabase
        .from('dealerships')
        .update({ name: dealershipName })
        .eq('id', dealershipId)

      if (dealershipError) {
        console.error('Error updating dealership:', dealershipError)
        hasError = true
      }

      // Use upsert to atomically insert or update configuration
      // This prevents race conditions where two concurrent saves could both
      // see no config exists, then both try to insert, causing one to fail
      // with a UNIQUE constraint violation
      const { error: configError } = await supabase
        .from('configurations')
        .upsert(
          { dealership_id: dealershipId, mode, phone },
          { onConflict: 'dealership_id' }
        )

      if (configError) {
        console.error('Error saving config:', configError)
        hasError = true
      }

      // Only show success if no errors occurred
      if (!hasError) {
        setSaved(true)
        // Reset saved indicator after 3 seconds
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // No dealership linked state
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your protection settings</p>
      </div>

      {/* Protection Mode Toggle */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Protection Mode</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Protection Mode Option */}
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
          
          {/* Monitor Mode Option */}
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
          {/* Dealership Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={dealershipName}
              onChange={(e) => setDealershipName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          {/* Phone Number */}
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
