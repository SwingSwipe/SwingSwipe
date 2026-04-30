import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'

import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import Discover from './pages/Discover'
import Games from './pages/Games'
import Crew from './pages/Crew'
import Rounds from './pages/Rounds'
import Profile from './pages/Profile'

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const [authView, setAuthView] = useState('login')
  const [activeTab, setActiveTab] = useState('discover')
  const [gameNotif, setGameNotif] = useState(0)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Listen for new game requests on my listings
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('game-request-notif')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'round_requests',
      }, async (payload) => {
        const { data: listing } = await supabase
          .from('round_listings').select('host_id').eq('id', payload.new.listing_id).single()
        if (listing?.host_id === user.id) {
          setGameNotif(n => n + 1)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#f0f2f0] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-[#1D9E75] rounded-[16px] flex items-center justify-center mb-4 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="10" r="5" fill="white" opacity="0.9"/>
            <path d="M16 15 L12 28 M16 15 L20 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M8 28 L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-black mb-2">SwingSwipe</h1>
        <p className="text-gray-500 text-sm mb-6">Add your Supabase credentials to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code> to get started.</p>
      </div>
    )
  }

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-[#f0f2f0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#1D9E75] rounded-[12px] flex items-center justify-center shadow-lg">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="10" r="5" fill="white" opacity="0.9"/>
              <path d="M16 15 L12 28 M16 15 L20 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M8 28 L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin mt-1" />
        </div>
      </div>
    )
  }

  if (isPasswordRecovery) return <ResetPassword onDone={() => setIsPasswordRecovery(false)} />

  if (!user) {
    return authView === 'login'
      ? <Login onSwitch={() => setAuthView('signup')} />
      : <Signup onSwitch={() => setAuthView('login')} />
  }

  if (!profile?.name) {
    return <Onboarding user={user} onComplete={() => window.location.reload()} />
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'discover': return <Discover user={user} />
      case 'games':    return <Games user={user} />
      case 'crew':     return <Crew user={user} />
      case 'rounds':   return <Rounds user={user} />
      case 'profile':  return <Profile user={user} />
      default:         return <Discover user={user} />
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-[#f0f2f0] overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {renderTab()}
      </div>
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); if (tab === 'games') setGameNotif(0) }}
        gameNotif={gameNotif}
      />
    </div>
  )
}
