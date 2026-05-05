import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { showToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import ConfirmSheet from '../components/ConfirmSheet'
import CourseInput from '../components/CourseInput'
import { GameHostCardSkeleton } from '../components/Skeleton'
import RatePlayersModal from '../components/RatePlayersModal'
import PublicProfileModal from '../components/PublicProfileModal'

const VIBE_LABELS = {
  casual: '😊 Casual',
  bread_game: '🍞 Bread game',
  competitive: '🏆 Competitive',
  fast_pace: '⚡ Fast pace',
  walking_only: '🚶 Walking only',
  social: '🤝 Social',
  practice_focused: '🎯 Practice',
}

const HANDICAP_LABELS = {
  beginner: 'Beginner',
  '90s': '90s shooter',
  '80s': '80s shooter',
  '70s': '70s shooter',
  scratch: 'Scratch',
}

const PLAYER_PACE_LABELS = {
  fast: '⚡ Fast',
  moderate: '🚶 Moderate',
  relaxed: '😌 Relaxed',
}

const TRANSPORT_LABELS = {
  cart: '🛺 Cart',
  walk: '🚶 Walk',
  either: '🔄 Cart or walk',
}

const PACE_LABELS = {
  quick: '⚡ Quick (~3h)',
  normal: '⏱ Normal (~4h)',
  relaxed: '☕ Relaxed (4.5h+)',
}

function GameChat({ listing, currentUserId, onClose }) {
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('round_messages').select('*')
        .eq('listing_id', listing.id).order('created_at', { ascending: true })
      if (data) {
        setMessages(data)
        const ids = [...new Set(data.map(m => m.user_id))]
        const { data: profs } = await supabase.from('profiles').select('id,name,avatar_url').in('id', ids)
        if (profs) {
          const map = {}
          profs.forEach(p => { map[p.id] = p })
          setProfiles(map)
        }
      }
    }
    fetch()
    const channel = supabase.channel(`game-chat-${listing.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'round_messages', filter: `listing_id=eq.${listing.id}` },
        payload => {
          setMessages(prev => [...prev, payload.new])
          supabase.from('profiles').select('id,name,avatar_url').eq('id', payload.new.user_id).single()
            .then(({ data }) => { if (data) setProfiles(prev => ({ ...prev, [data.id]: data })) })
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [listing.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim()) return
    await supabase.from('round_messages').insert({ listing_id: listing.id, user_id: currentUserId, content: text.trim() })
    setText('')
  }

  return (
    <Modal>
    <div className="fixed inset-0 bg-[#f0f2f0] z-50 flex flex-col">
      <div className="bg-[#1D9E75] text-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onClose} className="text-white/80 text-xl">←</button>
        <div>
          <p className="font-bold text-sm">{listing.course_name}</p>
          <p className="text-xs text-white/70">
            {new Date(listing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {listing.tee_time && ` · ${listing.tee_time.slice(0, 5)}`} · Game chat
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.user_id === currentUserId
          const sender = profiles[msg.user_id]
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {!isMe && <p className="text-xs text-gray-400 mb-0.5 ml-1">{sender?.name?.split(' ')[0] || 'Player'}</p>}
                <div className={`px-3 py-2 rounded-[14px] text-sm ${isMe ? 'bg-[#1D9E75] text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm text-gray-400">Coordinate with your playing partners</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input className="input-field flex-1" placeholder="Message…" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
        <button onClick={send} className="w-10 h-10 bg-[#1D9E75] rounded-[10px] flex items-center justify-center text-white font-bold">↑</button>
      </div>
    </div>
    </Modal>
  )
}

function PostGameModal({ userId, onClose, onPosted }) {
  const [form, setForm] = useState({
    course_name: '', date: '', tee_time: '',
    spots_total: 3, holes: '18', transport: 'either', pace: 'normal',
    vibe: 'casual', skill_range: 'all_welcome', notes: '',
    lat: null, lng: null,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.course_name || !form.date || !form.tee_time) return
    setSaving(true)
    const { error } = await supabase.from('round_listings').insert({

      host_id: userId,
      course_name: form.course_name,
      date: form.date,
      tee_time: form.tee_time,
      spots_total: parseInt(form.spots_total),
      spots_filled: 1,
      holes: parseInt(form.holes),
      transport: form.transport,
      pace: form.pace,
      vibe: form.vibe,
      skill_range: form.skill_range,
      notes: form.notes || null,
      is_active: true,
      lat: form.lat,
      lng: form.lng,
    })
    setSaving(false)
    if (error) showToast('Failed to post game. Try again.')
    else { onPosted(); onClose() }
  }

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] max-h-[92vh] flex flex-col">
        <div className="overflow-y-auto flex-1 px-5 pt-4 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <h2 className="text-base font-black mb-3">Post a game ⛳</h2>

          <div className="space-y-3">
            <CourseInput placeholder="Course name" value={form.course_name} onChange={v => set('course_name', v)} onSelect={c => setForm(f => ({ ...f, course_name: c.name, lat: c.lat, lng: c.lng }))} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tee time</label>
                <input className="input-field" type="time" value={form.tee_time} onChange={e => set('tee_time', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Open spots needed</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => set('spots_total', n + 1)}
                    className={`pill flex-1 py-1.5 ${form.spots_total === n + 1 ? 'pill-active' : 'pill-inactive'}`}>
                    {n} {n === 1 ? 'player' : 'players'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Holes</label>
              <div className="flex gap-2">
                {[['9', '9 holes'], ['18', '18 holes']].map(([val, label]) => (
                  <button key={val} onClick={() => set('holes', val)}
                    className={`pill flex-1 py-1.5 ${form.holes === val ? 'pill-active' : 'pill-inactive'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Transport</label>
              <div className="flex gap-2">
                {Object.entries(TRANSPORT_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => set('transport', val)}
                    className={`pill flex-1 py-1.5 ${form.transport === val ? 'pill-active' : 'pill-inactive'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Pace</label>
              <div className="flex gap-2">
                {Object.entries(PACE_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => set('pace', val)}
                    className={`pill flex-1 py-1.5 text-xs ${form.pace === val ? 'pill-active' : 'pill-inactive'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Vibe</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(VIBE_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => set('vibe', val)}
                    className={`pill py-1 ${form.vibe === val ? 'pill-active' : 'pill-inactive'}`}>{label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Skill range</label>
              <div className="flex flex-wrap gap-1.5">
                {[['all_welcome', 'All welcome'], ['sub_100', 'Sub-100'], ['sub_90', 'Sub-90'], ['sub_80', 'Sub-80'], ['scratch', 'Scratch']].map(([val, label]) => (
                  <button key={val} onClick={() => set('skill_range', val)}
                    className={`pill py-1 ${form.skill_range === val ? 'pill-active' : 'pill-inactive'}`}>{label}</button>
                ))}
              </div>
            </div>

            <textarea className="input-field resize-none" rows={2}
              placeholder="Notes (optional) — e.g. 'Walking round, bring cash for skins'" value={form.notes}
              onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        {/* Sticky post button */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button onClick={submit} className="btn-primary" disabled={saving || !form.course_name || !form.date || !form.tee_time}>
            {saving ? 'Posting…' : 'Post game ⛳'}
          </button>
        </div>
      </div>
    </>
    </Modal>
  )
}

export default function Games({ user }) {
  const [tab, setTab] = useState('discover')
  const [myGames, setMyGames] = useState([])
  const [joinedGames, setJoinedGames] = useState([])
  const [invites, setInvites] = useState([])
  const [pendingRequests, setPendingRequests] = useState({})
  const [confirmedPlayers, setConfirmedPlayers] = useState({})
  const [loading, setLoading] = useState(true)
  const [showPost, setShowPost] = useState(false)
  const [chatGame, setChatGame] = useState(null)
  const [rateGame, setRateGame] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [ratePlayers, setRatePlayers] = useState([])
  const [actingRequestId, setActingRequestId] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    const scrollEl = e.currentTarget
    const pulled = e.changedTouches[0].clientY - touchStartY.current
    if (pulled > 60 && scrollEl.scrollTop === 0) {
      setRefreshing(true)
      fetchGames().finally(() => setRefreshing(false))
    }
  }

  useEffect(() => { fetchGames() }, [])

  const fetchGames = async () => {
    setLoading(true)

    // My posted games
    const { data: mine } = await supabase
      .from('round_listings')
      .select('*')
      .eq('host_id', user.id)
      .order('date', { ascending: false })

    // Get pending requests for my games
    if (mine?.length) {
      const activeIds = mine.filter(g => g.is_active).map(g => g.id)
      if (activeIds.length) {
        const { data: reqs, error: reqError } = await supabase
          .from('round_requests')
          .select('id, listing_id, requester_id, status, created_at')
          .in('listing_id', activeIds)
          .eq('status', 'pending')
        if (reqError) showToast(`Could not load requests: ${reqError.message}`)
        const requesterIds = [...new Set((reqs || []).map(r => r.requester_id).filter(Boolean))]
        const { data: requesterProfiles } = requesterIds.length
          ? await supabase
              .from('profiles')
              .select('id, name, avatar_url, handicap_range, vibe_tags, pace, cart_or_walk, home_course, location')
              .in('id', requesterIds)
          : { data: [] }
        const profileMap = {}
        requesterProfiles?.forEach(p => { profileMap[p.id] = p })
        const reqMap = {}
        reqs?.forEach(r => {
          if (!reqMap[r.listing_id]) reqMap[r.listing_id] = []
          reqMap[r.listing_id].push({ ...r, profiles: profileMap[r.requester_id] })
        })
        setPendingRequests(reqMap)
      }
    }

    // Games I've joined
    const { data: joined } = await supabase
      .from('round_requests')
      .select('id, confirmed, round_listings(*, profiles!round_listings_host_id_fkey(name, avatar_url))')
      .eq('requester_id', user.id)
      .eq('status', 'accepted')

    // Invites sent to me
    const { data: inviteRows } = await supabase
      .from('round_requests')
      .select('*, round_listings(*, profiles!round_listings_host_id_fkey(name, avatar_url))')
      .eq('requester_id', user.id)
      .eq('status', 'invited')

    // Confirmation status for my hosted games
    if (mine?.length) {
      const upcomingIds = mine.filter(g => !isPast(g.date)).map(g => g.id)
      if (upcomingIds.length) {
        const { data: confReqs } = await supabase
          .from('round_requests')
          .select('listing_id, requester_id, confirmed, profiles(id, name)')
          .in('listing_id', upcomingIds)
          .eq('status', 'accepted')
        const confMap = {}
        confReqs?.forEach(r => {
          if (!confMap[r.listing_id]) confMap[r.listing_id] = []
          confMap[r.listing_id].push(r)
        })
        setConfirmedPlayers(confMap)
      }
    }

    setMyGames((mine || []).filter(g => g.is_active || isPast(g.date)))
    setJoinedGames(joined?.filter(j => j.round_listings).map(j => ({ ...j.round_listings, requestId: j.id, myConfirmed: j.confirmed })) || [])
    setInvites(inviteRows || [])
    setLoading(false)
  }

  const handleAccept = async (requestId, listingId) => {
    setActingRequestId(requestId)
    const { data: req } = await supabase
      .from('round_requests').select('requester_id').eq('id', requestId).single()
    const { error } = await supabase.from('round_requests').update({ status: 'accepted' }).eq('id', requestId)
    if (error) {
      showToast(`Failed to accept: ${error.message}`)
      setActingRequestId(null)
      return
    }
    const { data: listing } = await supabase
      .from('round_listings').select('spots_total, spots_filled, course_name, date, tee_time').eq('id', listingId).single()
    if (listing) {
      const newFilled = listing.spots_filled + 1
      const isFull = newFilled >= listing.spots_total
      const { error: listingError } = await supabase.from('round_listings')
        .update({ spots_filled: newFilled, ...(isFull && { is_active: false }) })
        .eq('id', listingId)
      if (listingError) showToast(`Accepted, but game count failed: ${listingError.message}`)
      // Notify the accepted player
      if (req?.requester_id) {
        const date = new Date(listing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        supabase.functions.invoke('send-push', {
          body: {
            user_id: req.requester_id,
            title: "You're in! Request accepted ✅",
            body: `${listing.course_name} · ${date}${listing.tee_time ? ` · ${listing.tee_time.slice(0, 5)}` : ''}`,
          },
        })
      }
    }
    showToast('Request accepted.', 'success')
    setActingRequestId(null)
    fetchGames()
  }

  const handleDecline = async (requestId) => {
    setActingRequestId(requestId)
    const { data: req } = await supabase
      .from('round_requests').select('requester_id, round_listings(course_name, date)').eq('id', requestId).single()
    const { error } = await supabase.from('round_requests').update({ status: 'declined' }).eq('id', requestId)
    if (error) {
      showToast(`Failed to decline: ${error.message}`)
      setActingRequestId(null)
      return
    }
    if (req?.requester_id && req?.round_listings) {
      const date = new Date(req.round_listings.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      supabase.functions.invoke('send-push', {
        body: {
          user_id: req.requester_id,
          title: 'Game request declined',
          body: `Your request to join ${req.round_listings.course_name} on ${date} wasn't accepted.`,
        },
      })
    }
    showToast('Request declined.', 'success')
    setActingRequestId(null)
    fetchGames()
  }

  const handleAcceptInvite = async (invite) => {
    const { error: requestError } = await supabase.from('round_requests').update({ status: 'accepted' }).eq('id', invite.id)
    if (requestError) {
      showToast(`Could not accept invite: ${requestError.message}`)
      return
    }
    const newFilled = (invite.round_listings.spots_filled || 1) + 1
    const isFull = newFilled >= invite.round_listings.spots_total
    const { error: listingError } = await supabase.from('round_listings')
      .update({ spots_filled: newFilled, ...(isFull && { is_active: false }) })
      .eq('id', invite.listing_id)
    if (listingError) {
      showToast(`Invite accepted, but game count failed: ${listingError.message}`)
      return
    }
    showToast('Invite accepted.', 'success')
    fetchGames()
  }

  const handleDeclineInvite = async (inviteId) => {
    const { error } = await supabase.from('round_requests').delete().eq('id', inviteId)
    if (error) {
      showToast(`Could not decline invite: ${error.message}`)
      return
    }
    showToast('Invite declined.', 'success')
    fetchGames()
  }

  const handleDeleteGame = async () => {
    const game = myGames.find(g => g.id === confirmDelete)
    setConfirmDelete(null)
    if (!game) return
    showToast(game.spots_filled > 1 ? 'Cancelling game…' : 'Deleting game…', 'success')

    // Get accepted players to notify
    const { data: accepted } = await supabase
      .from('round_requests')
      .select('requester_id')
      .eq('listing_id', game.id)
      .eq('status', 'accepted')

    // Post cancellation message to chat (before deleting so RLS still allows it)
    if (accepted?.length) {
      await supabase.from('round_messages').insert({
        listing_id: game.id,
        user_id: user.id,
        content: `❌ This game has been cancelled by the host.`,
      })
      // Push notify each accepted player
      const title = 'Game cancelled ❌'
      const body = `${game.course_name} on ${new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} was cancelled by the host.`
      for (const { requester_id } of accepted) {
        await supabase.functions.invoke('send-push', { body: { user_id: requester_id, title, body } })
      }
    }

    const { error: requestDeleteError } = await supabase
      .from('round_requests')
      .delete()
      .eq('listing_id', game.id)

    if (requestDeleteError) {
      showToast(`Could not remove requests: ${requestDeleteError.message}`)
      return
    }

    const { error: listingDeleteError } = await supabase
      .from('round_listings')
      .delete()
      .eq('id', game.id)

    if (listingDeleteError) {
      const { error: closeError } = await supabase
        .from('round_listings')
        .update({ is_active: false })
        .eq('id', game.id)

      if (closeError) {
        showToast(`Could not cancel game: ${listingDeleteError.message}`)
        return
      }

      showToast('Game closed.', 'success')
      fetchGames()
      return
    }

    showToast(game.spots_filled > 1 ? 'Game cancelled.' : 'Game deleted.', 'success')
    fetchGames()
  }

  const openRateModal = async (game) => {
    // Get all accepted players for this game
    const { data: reqs } = await supabase
      .from('round_requests')
      .select('profiles(id, name, avatar_url)')
      .eq('listing_id', game.id)
      .eq('status', 'accepted')

    const players = reqs?.map(r => r.profiles).filter(Boolean) || []
    // Add host
    const { data: host } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', game.host_id).single()
    if (host) players.push(host)

    setRatePlayers(players)
    setRateGame(game)
  }

  const isPast = (dateStr) => new Date(dateStr + 'T23:59:59') < new Date()
  const isUpcoming = (dateStr) => {
    const diff = new Date(dateStr + 'T00:00:00') - new Date()
    return diff >= 0 && diff <= 48 * 3600 * 1000
  }

  const handleConfirm = async (requestId) => {
    await supabase.from('round_requests').update({ confirmed: true }).eq('id', requestId)
    fetchGames()
  }

  const handleRemindPlayers = async (game) => {
    const unconfirmed = (confirmedPlayers[game.id] || []).filter(r => !r.confirmed)
    for (const r of unconfirmed) {
      await supabase.functions.invoke('send-push', {
        body: {
          user_id: r.requester_id,
          title: "Game tomorrow — confirm you're coming ⛳",
          body: `${game.course_name} · ${game.tee_time?.slice(0, 5) || ''}. Tap to confirm.`,
        },
      })
    }
  }

  const handleShare = (game) => {
    const date = new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const time = game.tee_time ? game.tee_time.slice(0, 5) : ''
    const spots = game.spots_total - game.spots_filled
    const text = `Join me for golf! ⛳\n${game.holes || 18} holes at ${game.course_name}\n📅 ${date}${time ? ` · ${time}` : ''}\n${spots} spot${spots !== 1 ? 's' : ''} left\n\nFind me on SwingSwipe: ${window.location.origin}`
    if (navigator.share) {
      navigator.share({ title: 'Join my golf game', text })
    } else {
      navigator.clipboard?.writeText(text)
    }
  }

  const totalPending = Object.values(pendingRequests).reduce((a, b) => a + b.length, 0)
  const totalInvites = invites.length

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        {/* Golf ball decoration */}
        <svg className="absolute right-3 top-5 opacity-10" width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" fill="white"/>
          <circle cx="30" cy="30" r="3" fill="#1D9E75"/>
          <circle cx="42" cy="26" r="2.5" fill="#1D9E75"/>
          <circle cx="52" cy="34" r="3" fill="#1D9E75"/>
          <circle cx="50" cy="46" r="2.5" fill="#1D9E75"/>
          <circle cx="38" cy="52" r="3" fill="#1D9E75"/>
          <circle cx="28" cy="44" r="2.5" fill="#1D9E75"/>
        </svg>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Tee times</p>
        <h1 className="text-white text-2xl font-black mb-0.5">Games 🏌️</h1>
        <p className="text-white/70 text-xs mb-3">Post a game or manage your tee times</p>
        <div className="flex gap-2">
          <button onClick={() => setTab('mine')}
            className={`pill flex-1 py-1.5 font-bold relative ${tab === 'mine' ? 'bg-white text-[#1D9E75]' : 'bg-white/20 text-white'}`}>
            My Games
            {totalPending > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{totalPending}</span>}
          </button>
          <button onClick={() => setTab('joined')}
            className={`pill flex-1 py-1.5 font-bold relative ${tab === 'joined' ? 'bg-white text-[#1D9E75]' : 'bg-white/20 text-white'}`}>
            Joined
            {totalInvites > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{totalInvites}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {refreshing && (
          <div className="flex justify-center mb-2">
            <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => <GameHostCardSkeleton key={i} />)}
          </>
        ) : tab === 'mine' ? (
          <>
            {myGames.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-5xl mb-3">⛳</p>
                <p className="font-bold text-gray-700 text-lg">No games posted yet</p>
                <p className="text-sm text-gray-400 mt-2">Book a tee time, then post it here to find players.</p>
              </div>
            ) : (() => {
              const upcomingGames = myGames.filter(g => !isPast(g.date))
              const pastGames = myGames.filter(g => isPast(g.date))
              const renderGame = (game) => {
                const isGamePast = isPast(game.date)
                const requests = pendingRequests[game.id] || []
                return (
                  <div key={game.id} className="card mb-4 overflow-hidden">
                    <div className={`h-1.5 ${game.is_active && !isGamePast ? 'bg-[#1D9E75]' : 'bg-gray-300'}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-bold">{game.course_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {game.holes && <span className="pill text-[10px] bg-gray-100 text-gray-500 py-0.5">{game.holes} holes</span>}
                            {game.transport && <span className="pill text-[10px] bg-gray-100 text-gray-500 py-0.5">{TRANSPORT_LABELS[game.transport]}</span>}
                            {game.pace && <span className="pill text-[10px] bg-orange-50 text-orange-500 py-0.5">{PACE_LABELS[game.pace]}</span>}
                          </div>
                        </div>
                        <span className={`pill text-xs ${game.is_active && !isGamePast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isGamePast ? 'Played' : game.is_active ? `${game.spots_total - game.spots_filled} spots left` : 'Closed'}
                        </span>
                      </div>

                      {requests.length > 0 && (
                        <div className="mt-3 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">{requests.length} request{requests.length > 1 ? 's' : ''}</p>
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Needs review</span>
                          </div>
                          {requests.map(req => (
                            <div key={req.id} className="bg-[#f8faf9] border border-gray-100 rounded-[16px] p-3 mb-2 last:mb-0">
                              <button
                                onClick={() => setViewingProfile(req.requester_id)}
                                className="w-full flex items-start gap-3 text-left active:opacity-75"
                              >
                                <Avatar name={req.profiles?.name} url={req.profiles?.avatar_url} size={11} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-black text-sm text-gray-900 truncate">
                                        {req.profiles?.name || 'Golf player'}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                                        📍 {req.profiles?.home_course || req.profiles?.location || 'No home course'}
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 shrink-0">View →</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <span className="pill bg-[#1D9E75]/10 text-[#064e35] text-[10px] py-0.5">
                                      {HANDICAP_LABELS[req.profiles?.handicap_range] || 'Skill not set'}
                                    </span>
                                    {req.profiles?.pace && (
                                      <span className="pill bg-blue-50 text-blue-600 text-[10px] py-0.5">
                                        {PLAYER_PACE_LABELS[req.profiles.pace] || req.profiles.pace}
                                      </span>
                                    )}
                                    {req.profiles?.cart_or_walk && (
                                      <span className="pill bg-gray-100 text-gray-600 text-[10px] py-0.5">
                                        {req.profiles.cart_or_walk === 'cart' ? '🛺 Cart' : req.profiles.cart_or_walk === 'walking' ? '🚶 Walk' : 'Cart/walk'}
                                      </span>
                                    )}
                                    {req.profiles?.vibe_tags?.slice(0, 2).map(tag => (
                                      <span key={tag} className="pill bg-green-50 text-green-700 text-[10px] py-0.5">
                                        {VIBE_LABELS[tag] || tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                <button
                                  onClick={() => handleDecline(req.id)}
                                  disabled={actingRequestId === req.id}
                                  className="h-10 rounded-[12px] bg-red-50 text-red-500 flex items-center justify-center text-sm font-black disabled:opacity-50 active:scale-[0.98] transition-transform"
                                >
                                  Deny
                                </button>
                                <button
                                  onClick={() => handleAccept(req.id, game.id)}
                                  disabled={actingRequestId === req.id}
                                  className="h-10 rounded-[12px] bg-[#1D9E75] text-white flex items-center justify-center text-sm font-black disabled:opacity-50 active:scale-[0.98] transition-transform"
                                >
                                  {actingRequestId === req.id ? 'Saving…' : 'Accept'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setChatGame(game)} className="flex-1 py-2 bg-gray-100 rounded-[8px] text-sm font-semibold text-gray-700">
                          💬 Chat
                        </button>
                        {isGamePast ? (
                          <button onClick={() => openRateModal(game)} className="flex-1 py-2 bg-[#1D9E75]/10 rounded-[8px] text-sm font-semibold text-[#1D9E75]">
                            ⭐ Rate players
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleShare(game)} className="flex-1 py-2 bg-blue-50 rounded-[8px] text-sm font-semibold text-blue-600">
                              🔗 Share
                            </button>
                            <button onClick={() => setConfirmDelete(game.id)} className="flex-1 py-2 bg-red-50 rounded-[8px] text-sm font-semibold text-red-500">
                              Cancel
                            </button>
                          </>
                        )}
                        {!isGamePast && confirmedPlayers[game.id]?.length > 0 && (() => {
                          const conf = confirmedPlayers[game.id]
                          const confCount = conf.filter(r => r.confirmed).length
                          const unconfCount = conf.filter(r => !r.confirmed).length
                          return (
                            <div className="flex items-center justify-between mt-2 px-1">
                              <p className="text-xs text-gray-400">{confCount}/{conf.length} confirmed</p>
                              {unconfCount > 0 && (
                                <button onClick={() => handleRemindPlayers(game)} className="text-xs text-[#1D9E75] font-semibold">
                                  Remind {unconfCount} player{unconfCount > 1 ? 's' : ''} →
                                </button>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <>
                  {upcomingGames.length > 0 && (
                    <>
                      <p className="section-label mb-3">Upcoming · {upcomingGames.length}</p>
                      {upcomingGames.map(renderGame)}
                    </>
                  )}
                  {pastGames.length > 0 && (
                    <>
                      <p className="section-label mb-3 mt-2">Past rounds · {pastGames.length}</p>
                      {pastGames.map(renderGame)}
                    </>
                  )}
                </>
              )
            })()}
          </>
        ) : (
          <>
            {invites.length > 0 && (
              <div className="mb-4">
                <p className="section-label mb-2">🎉 You've been invited</p>
                {invites.map(invite => {
                  const game = invite.round_listings
                  if (!game) return null
                  return (
                    <div key={invite.id} className="card mb-3 overflow-hidden border-2 border-orange-200">
                      <div className="h-1.5 bg-orange-400" />
                      <div className="p-4">
                        <p className="font-bold">{game.course_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 mb-3">
                          {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
                          {game.profiles?.name && ` · Invited by ${game.profiles.name.split(' ')[0]}`}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeclineInvite(invite.id)} className="flex-1 py-2 bg-red-50 rounded-[8px] text-sm font-semibold text-red-500">
                            Decline
                          </button>
                          <button onClick={() => handleAcceptInvite(invite)} className="flex-1 py-2 bg-[#1D9E75] rounded-[8px] text-sm font-semibold text-white">
                            Accept ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {joinedGames.length === 0 && invites.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-5xl mb-3">🏌️</p>
                <p className="font-bold text-gray-700 text-lg">No games joined yet</p>
                <p className="text-sm text-gray-400 mt-2">Find open games in the Discover tab.</p>
              </div>
            ) : joinedGames.length > 0 ? (
              joinedGames.map(game => (
                <div key={game.id} className="card mb-3 overflow-hidden">
                  <div className="h-1.5 bg-[#1D9E75]" />
                  <div className="p-4">
                    <p className="font-bold">{game.course_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
                      {game.profiles?.name && ` · Hosted by ${game.profiles.name.split(' ')[0]}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5 mb-3">
                      {game.holes && <span className="pill text-[10px] bg-gray-100 text-gray-500 py-0.5">{game.holes} holes</span>}
                      {game.transport && <span className="pill text-[10px] bg-gray-100 text-gray-500 py-0.5">{TRANSPORT_LABELS[game.transport]}</span>}
                      {game.pace && <span className="pill text-[10px] bg-orange-50 text-orange-500 py-0.5">{PACE_LABELS[game.pace]}</span>}
                    </div>
                    {isUpcoming(game.date) && !game.myConfirmed && (
                      <div className="mb-3 p-3 bg-orange-50 rounded-[10px] flex items-center justify-between">
                        <p className="text-xs font-semibold text-orange-700">Confirm you're coming ⛳</p>
                        <button onClick={() => handleConfirm(game.requestId)} className="text-xs bg-orange-500 text-white font-bold px-3 py-1.5 rounded-[8px] active:opacity-80">
                          I'm in ✓
                        </button>
                      </div>
                    )}
                    {isUpcoming(game.date) && game.myConfirmed && (
                      <p className="text-xs text-[#1D9E75] font-semibold mb-3">✓ You've confirmed attendance</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setChatGame(game)} className="flex-1 py-2 bg-gray-100 rounded-[8px] text-sm font-semibold text-gray-700">
                        💬 Chat
                      </button>
                      {isPast(game.date) && (
                        <button onClick={() => openRateModal(game)} className="flex-1 py-2 bg-[#1D9E75]/10 rounded-[8px] text-sm font-semibold text-[#1D9E75]">
                          ⭐ Rate players
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : null}
          </>
        )}
      </div>

      {/* Post FAB */}
      <button
        onClick={() => setShowPost(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#1D9E75] rounded-full shadow-lg shadow-[#1D9E75]/40 flex items-center justify-center text-white text-3xl z-40 active:scale-95 transition-transform"
      >
        +
      </button>

      {showPost && <PostGameModal userId={user.id} onClose={() => setShowPost(false)} onPosted={fetchGames} />}
      {chatGame && <GameChat listing={chatGame} currentUserId={user.id} onClose={() => setChatGame(null)} />}
      {viewingProfile && (
        <PublicProfileModal
          userId={viewingProfile}
          currentUserId={user.id}
          onClose={() => setViewingProfile(null)}
        />
      )}
      {confirmDelete && <ConfirmSheet
        title={(myGames.find(g => g.id === confirmDelete)?.spots_filled || 0) > 1 ? 'Cancel this game?' : 'Delete this game?'}
        message={(myGames.find(g => g.id === confirmDelete)?.spots_filled || 0) > 1
          ? 'All accepted players will be notified that the game is cancelled.'
          : 'This game has no players yet. It will be removed.'}
        confirmLabel={(myGames.find(g => g.id === confirmDelete)?.spots_filled || 0) > 1 ? 'Yes, cancel game' : 'Delete game'}
        onConfirm={handleDeleteGame}
        onCancel={() => setConfirmDelete(null)}
      />}
      {rateGame && (
        <RatePlayersModal
          listing={rateGame}
          currentUserId={user.id}
          players={ratePlayers}
          onClose={() => setRateGame(null)}
          onDone={fetchGames}
        />
      )}
    </div>
  )
}
