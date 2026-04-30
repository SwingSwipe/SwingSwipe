import { useState } from 'react'
import { supabase } from '../supabase'

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Reset password</h1>
          <p className="text-sm text-gray-500 mt-1">We'll send you a link to reset it.</p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-4xl mb-3">📬</p>
            <p className="font-semibold text-gray-700">Check your email</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">A reset link was sent to <strong>{email}</strong>. Click it to set a new password.</p>
            <button onClick={onBack} className="btn-primary">Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              className="input-field"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={onBack} className="w-full text-center text-sm text-gray-500 mt-2">
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Login({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)

  if (showForgot) return <ForgotPassword onBack={() => setShowForgot(false)} />

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">SwingSwipe</h1>
          <p className="text-sm text-gray-500 mt-1">Stop organizing golf through group texts.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setShowForgot(true)} className="text-sm text-gray-400">
            Forgot password?
          </button>
          <button onClick={onSwitch} className="text-sm text-[#1D9E75] font-semibold">
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
