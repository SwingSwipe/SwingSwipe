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

function DesktopBackground() {
  return (
    <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none select-none">
      {/* Golf balls */}
      <div style={{ position: 'absolute', top: '12%', left: '6%', opacity: 0.13, animation: 'float-golf-1 11s ease-in-out infinite' }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="33" fill="white"/>
          <circle cx="27" cy="27" r="2.5" fill="rgba(0,80,40,0.35)"/><circle cx="38" cy="23" r="2" fill="rgba(0,80,40,0.35)"/>
          <circle cx="47" cy="31" r="2.5" fill="rgba(0,80,40,0.35)"/><circle cx="45" cy="42" r="2" fill="rgba(0,80,40,0.35)"/>
          <circle cx="35" cy="48" r="2.5" fill="rgba(0,80,40,0.35)"/><circle cx="25" cy="41" r="2" fill="rgba(0,80,40,0.35)"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '55%', left: '4%', opacity: 0.1, animation: 'float-golf-3 14s ease-in-out infinite 2s' }}>
        <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
          <circle cx="27" cy="27" r="24" fill="white"/>
          <circle cx="20" cy="20" r="2" fill="rgba(0,80,40,0.35)"/><circle cx="29" cy="17" r="1.5" fill="rgba(0,80,40,0.35)"/>
          <circle cx="35" cy="23" r="2" fill="rgba(0,80,40,0.35)"/><circle cx="33" cy="32" r="1.5" fill="rgba(0,80,40,0.35)"/>
          <circle cx="25" cy="36" r="2" fill="rgba(0,80,40,0.35)"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '30%', right: '5%', opacity: 0.11, animation: 'float-golf-2 9s ease-in-out infinite 1s' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="29" fill="white"/>
          <circle cx="24" cy="24" r="2.2" fill="rgba(0,80,40,0.35)"/><circle cx="34" cy="20" r="1.8" fill="rgba(0,80,40,0.35)"/>
          <circle cx="42" cy="28" r="2.2" fill="rgba(0,80,40,0.35)"/><circle cx="40" cy="38" r="1.8" fill="rgba(0,80,40,0.35)"/>
          <circle cx="30" cy="43" r="2.2" fill="rgba(0,80,40,0.35)"/><circle cx="22" cy="36" r="1.8" fill="rgba(0,80,40,0.35)"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', bottom: '14%', right: '7%', opacity: 0.09, animation: 'float-golf-4 13s ease-in-out infinite 3s' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" fill="white"/>
          <circle cx="18" cy="18" r="1.8" fill="rgba(0,80,40,0.35)"/><circle cx="26" cy="15" r="1.4" fill="rgba(0,80,40,0.35)"/>
          <circle cx="32" cy="21" r="1.8" fill="rgba(0,80,40,0.35)"/><circle cx="30" cy="29" r="1.4" fill="rgba(0,80,40,0.35)"/>
          <circle cx="22" cy="32" r="1.8" fill="rgba(0,80,40,0.35)"/>
        </svg>
      </div>

      {/* Golf flags */}
      <div style={{ position: 'absolute', top: '8%', right: '10%', opacity: 0.14, animation: 'float-golf-1 15s ease-in-out infinite 4s' }}>
        <svg width="52" height="76" viewBox="0 0 52 76" fill="none">
          <line x1="20" y1="6" x2="20" y2="68" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M20 6 L50 18 L20 32 Z" fill="white"/>
          <ellipse cx="20" cy="68" rx="14" ry="4" fill="white"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', bottom: '18%', left: '8%', opacity: 0.11, animation: 'float-golf-3 12s ease-in-out infinite 5s' }}>
        <svg width="40" height="58" viewBox="0 0 40 58" fill="none">
          <line x1="15" y1="4" x2="15" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M15 4 L38 13 L15 24 Z" fill="white"/>
          <ellipse cx="15" cy="52" rx="11" ry="3" fill="white"/>
        </svg>
      </div>

      {/* Tees */}
      <div style={{ position: 'absolute', top: '72%', right: '12%', opacity: 0.1, animation: 'float-golf-2 10s ease-in-out infinite 2s' }}>
        <svg width="28" height="48" viewBox="0 0 28 48" fill="none">
          <circle cx="14" cy="9" r="9" fill="white"/>
          <rect x="12" y="17" width="4" height="28" rx="2" fill="white"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '42%', left: '3%', opacity: 0.08, animation: 'float-golf-4 16s ease-in-out infinite 6s' }}>
        <svg width="22" height="38" viewBox="0 0 22 38" fill="none">
          <circle cx="11" cy="7" r="7" fill="white"/>
          <rect x="9.5" y="13" width="3" height="22" rx="1.5" fill="white"/>
        </svg>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const [authView, setAuthView] = useState('login')
  const [activeTab, setActiveTab] = useState('discover')
  const [gameNotif, setGameNotif] = useState(0)
  const [crewNotif, setCrewNotif] = useState(0)
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

  const renderContent = () => {
    if (!isSupabaseConfigured) return (
      <div className="h-full bg-[#f0f2f0] flex flex-col items-center justify-center px-6 text-center">
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

    if (authLoading || (user && profileLoading)) return (
      <div className="h-full bg-[#f0f2f0] flex items-center justify-center">
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

    if (isPasswordRecovery) return <ResetPassword onDone={() => setIsPasswordRecovery(false)} />
    if (!user) return authView === 'login'
      ? <Login onSwitch={() => setAuthView('signup')} />
      : <Signup onSwitch={() => setAuthView('login')} />
    if (!profile?.name) return <Onboarding user={user} onComplete={() => window.location.reload()} />

    const renderTab = () => {
      switch (activeTab) {
        case 'discover': return <Discover user={user} />
        case 'games':    return <Games user={user} />
        case 'crew':     return <Crew user={user} onFriendRequestsChange={setCrewNotif} />
        case 'rounds':   return <Rounds user={user} />
        case 'profile':  return <Profile user={user} />
        default:         return <Discover user={user} />
      }
    }

    return (
      <>
        <div className="flex-1 overflow-hidden relative">{renderTab()}</div>
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            if (tab === 'games') setGameNotif(0)
            if (tab === 'crew') setCrewNotif(0)
          }}
          gameNotif={gameNotif}
          crewNotif={crewNotif}
        />
      </>
    )
  }

  return (
    <>
      <DesktopBackground />
      <div className="phone-wrapper w-full max-w-lg mx-auto">
        <div className="phone-device">
          <div className="flex flex-col h-screen md:h-full bg-[#f0f2f0] overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  )
}
