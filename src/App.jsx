import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'

import BottomNav from './components/BottomNav'
import Toast, { useToast } from './components/Toast'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import Discover from './pages/Discover'
import Games from './pages/Games'
import Crew from './pages/Crew'
import Activity from './pages/Activity'
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
  const [activityNotif, setActivityNotif] = useState(0)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Capture PWA install prompt
  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (isInstalled) return
    const dismissed = localStorage.getItem('pwa_install_dismissed')
    if (dismissed) return

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setTimeout(() => setShowInstallBanner(true), 30000)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setTimeout(() => setShowInstallBanner(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
    setShowInstallBanner(false)
  }

  const dismissInstall = () => {
    localStorage.setItem('pwa_install_dismissed', '1')
    setShowInstallBanner(false)
  }

  // Request notification permission and save push subscription
  useEffect(() => {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return
    const setup = async () => {
      let permission = Notification.permission
      if (permission === 'default') permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      try {
        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
          })
        }
        await supabase.from('push_subscriptions').upsert(
          { user_id: user.id, subscription: sub.toJSON() },
          { onConflict: 'user_id' }
        )
      } catch (e) { /* push not supported or blocked */ }
    }
    setup()
  }, [user])

  const sendPush = (userId, title, body) => {
    supabase.functions.invoke('send-push', { body: { user_id: userId, title, body } }).catch(() => {})
  }

  // Listen for new game requests on my listings
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('game-request-notif')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'round_requests',
      }, async (payload) => {
        const { data: listing } = await supabase
          .from('round_listings').select('host_id, course_name').eq('id', payload.new.listing_id).single()
        if (listing?.host_id === user.id) {
          setGameNotif(n => n + 1)
          setActivityNotif(n => n + 1)
          if (Notification.permission === 'granted') {
            new Notification('New join request ⛳', {
              body: `Someone wants to join your game at ${listing.course_name}`,
              icon: '/icon-192.png',
            })
          } else {
            sendPush(user.id, 'New join request ⛳', `Someone wants to join your game at ${listing.course_name}`)
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  // Notify requester when their request is accepted
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('request-accepted-notif')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'round_requests',
        filter: `requester_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.status === 'accepted') {
          const { data: listing } = await supabase
            .from('round_listings').select('course_name').eq('id', payload.new.listing_id).single()
          const title = "You're in! 🎉"
          const body = `Your request to join ${listing?.course_name || 'the game'} was accepted`
          if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon-192.png' })
          } else {
            sendPush(user.id, title, body)
          }
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
        case 'discover': return <Discover user={user} userProfile={profile} onNavigateTab={setActiveTab} />
        case 'games':    return <Games user={user} />
        case 'crew':     return <Crew user={user} onFriendRequestsChange={setCrewNotif} />
        case 'activity': return <Activity user={user} />
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
            if (tab === 'activity') setActivityNotif(0)
          }}
          gameNotif={gameNotif}
          crewNotif={crewNotif}
          activityNotif={activityNotif}
        />
        {showInstallBanner && (
          <div className="fixed inset-0 z-[80] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={dismissInstall} />
            <div className="relative bg-white rounded-t-[24px] p-6 z-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-[#1D9E75] rounded-[16px] flex items-center justify-center text-3xl shadow-lg">⛳</div>
                <div>
                  <p className="font-black text-lg">Add SwingSwipe</p>
                  <p className="text-sm text-gray-400">to your home screen</p>
                </div>
              </div>
              {installPrompt ? (
                <>
                  <p className="text-sm text-gray-500 mb-5">Get instant access and push notifications — no App Store needed.</p>
                  <button onClick={handleInstall} className="w-full py-3.5 bg-[#1D9E75] text-white font-bold rounded-[14px] text-base active:opacity-80 mb-2">
                    Add to Home Screen
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">Install SwingSwipe for quick access and notifications:</p>
                  <div className="space-y-3 mb-5">
                    {[
                      ['1', 'Tap the Share button', '⬆️', 'at the bottom of Safari'],
                      ['2', 'Scroll down and tap', '➕', '"Add to Home Screen"'],
                      ['3', 'Tap', '✓', '"Add" in the top right'],
                    ].map(([num, pre, icon, post]) => (
                      <div key={num} className="flex items-center gap-3 bg-gray-50 rounded-[12px] px-4 py-3">
                        <span className="w-6 h-6 bg-[#1D9E75] text-white text-xs font-black rounded-full flex items-center justify-center shrink-0">{num}</span>
                        <p className="text-sm text-gray-700">{pre} <span className="text-base">{icon}</span> {post}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <button onClick={dismissInstall} className="w-full text-center text-sm text-gray-400 py-2">
                Not now
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <Toast toast={toast} />
      <DesktopBackground />
      <div className="hidden md:flex flex-col items-center" style={{ position: 'relative', zIndex: 10 }}>
        <div className="phone-wrapper">
          <div className="phone-device">
            <div className="flex flex-col md:h-full bg-[#f0f2f0] overflow-hidden">
              {renderContent()}
            </div>
          </div>
        </div>
        {/* Below-phone tagline — desktop only */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-white/50 text-xs tracking-widest uppercase font-semibold">SwingSwipe</p>
          <p className="text-white/70 text-sm font-medium">Find the right people to play with ⛳</p>
          <div className="flex gap-3 mt-1">
            <span className="flex items-center gap-1.5 bg-white/10 text-white/60 text-xs font-semibold px-4 py-2 rounded-full border border-white/15">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              iOS — Coming soon
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 text-white/60 text-xs font-semibold px-4 py-2 rounded-full border border-white/15">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4044-6.6012l1.9297-3.3423c.1065-.1847.0435-.4218-.1408-.5284-.1847-.1065-.4218-.0435-.5284.1408l-1.9543 3.388C15.5457 7.8468 13.8626 7.4 12 7.4c-1.8626 0-3.5457.4468-4.8304 1.1093L5.2156 5.1214c-.1065-.1847-.3438-.2477-.5284-.1408-.1843.1065-.2473.3437-.1408.5284l1.9297 3.3423C4.2177 10.3867 3 12.3802 3 14.6h18c0-2.2198-1.2177-4.2133-3.1186-5.8598"/></svg>
              Android — Coming soon
            </span>
          </div>
        </div>
      </div>
      {/* Mobile: no frame wrapper needed */}
      <div className="md:hidden w-full">
        <div className="flex flex-col h-screen bg-[#f0f2f0] overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </>
  )
}
