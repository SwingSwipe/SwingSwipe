import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'

import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import Feed from './pages/Feed'
import Crew from './pages/Crew'
import Leaderboard from './pages/Leaderboard'
import Rounds from './pages/Rounds'
import Explore from './pages/Explore'

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const [authView, setAuthView] = useState('login')
  const [activeTab, setActiveTab] = useState('feed')
  const [crewNotif, setCrewNotif] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('crew-listing-notif')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'round_listings',
      }, async (payload) => {
        const { data: isFriend } = await supabase
          .from('friends')
          .select('id')
          .eq('user_id', user.id)
          .eq('friend_id', payload.new.host_id)
          .maybeSingle()
        if (isFriend) setCrewNotif(true)
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
        <div className="card p-4 text-left w-full max-w-sm text-xs font-mono text-gray-600 space-y-1">
          <p>VITE_SUPABASE_URL=https://xxx.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=eyJ...</p>
        </div>
        <p className="text-xs text-gray-400 mt-4">Then restart the dev server.</p>
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

  if (isPasswordRecovery) {
    return <ResetPassword onDone={() => setIsPasswordRecovery(false)} />
  }

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
      case 'feed':        return <Feed user={user} />
      case 'crew':        return <Crew user={user} onNotifClear={() => setCrewNotif(false)} />
      case 'leaderboard': return <Leaderboard user={user} profile={profile} />
      case 'rounds':      return <Rounds user={user} />
      case 'explore':     return <Explore />
      default:            return <Feed user={user} />
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-[#f0f2f0] overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {renderTab()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} crewNotif={crewNotif} />
    </div>
  )
}
