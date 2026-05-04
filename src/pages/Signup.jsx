import { useState } from 'react'
import { supabase } from '../supabase'

export default function Signup({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-[#1D9E75] rounded-[16px] flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg">✉️</div>
          <h1 className="text-2xl font-black text-[#1a1a1a]">Check your email</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            We sent a confirmation link to <span className="font-bold text-gray-700">{email}</span>. Confirm it, then come back and sign in.
          </p>
          <button onClick={onSwitch} className="btn-primary mt-6">
            Go to sign in
          </button>
          <button onClick={() => setSent(false)} className="w-full text-center text-sm text-gray-400 mt-4">
            Use a different email
          </button>
        </div>
      </div>
    )
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
          <p className="text-sm text-gray-500 mt-1">Join the golf crew.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
            placeholder="Password (min 6 chars)"
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <button onClick={onSwitch} className="text-[#1D9E75] font-semibold">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
