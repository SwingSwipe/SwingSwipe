import { useState } from 'react'
import { supabase } from '../supabase'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(onDone, 2000)
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#1D9E75] rounded-[14px] flex items-center justify-center mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="10" r="5" fill="white" opacity="0.9"/>
              <path d="M16 15 L12 28 M16 15 L20 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M8 28 L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">New password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose something you'll remember.</p>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-700">Password updated!</p>
            <p className="text-sm text-gray-400 mt-1">Signing you in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="input-field"
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <input
              className="input-field"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
