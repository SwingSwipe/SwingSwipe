import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import { ActivityItemSkeleton } from '../components/Skeleton'
import RatePlayersModal from '../components/RatePlayersModal'
import { showToast } from '../components/Toast'

const HANDICAP_LABELS = { beginner: 'Beginner', '90s': '90s shooter', '80s': '80s shooter', '70s': '70s shooter', scratch: 'Scratch' }
const PACE_LABELS = { fast: 'Fast', moderate: 'Moderate', relaxed: 'Relaxed' }

function RequestTrustStrip({ profile }) {
  if (!profile) return null
  const chips = [
    HANDICAP_LABELS[profile.handicap_range] || 'Skill not set',
    profile.avg_score ? `Avg ${profile.avg_score}` : 'Avg not set',
    PACE_LABELS[profile.pace] || 'Pace not set',
    profile.cart_or_walk === 'cart' ? 'Cart' : profile.cart_or_walk === 'walking' ? 'Walks' : profile.cart_or_walk === 'either' ? 'Cart/walk' : 'Style not set',
    profile.home_course || profile.location || 'No home course',
  ].filter(Boolean)
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {chips.map(chip => (
        <span key={chip} className="rounded-full bg-[#f2f8f5] text-[#064e35] px-2.5 py-1 text-[10px] font-black">{chip}</span>
      ))}
    </div>
  )
}

function timeAgo(ts) {
  if (!ts) return 'just now'
  const diff = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(diff)) return 'just now'
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Activity({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [unratedGames, setUnratedGames] = useState([])
  const [rateGame, setRateGame] = useState(null)
  const [ratePlayers, setRatePlayers] = useState([])

  const fetchUnratedGames = async () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Games I hosted that have passed
    const { data: hosted } = await supabase
      .from('round_listings')
      .select('id, course_name, date, tee_time')
      .eq('host_id', user.id)
      .lt('date', today)
      .gte('date', cutoff)

    // Games I joined that have passed
    const { data: joined } = await supabase
      .from('round_requests')
      .select('listing_id, round_listings(id, course_name, date, tee_time, host_id)')
      .eq('requester_id', user.id)
      .eq('status', 'accepted')

    const joinedPast = joined
      ?.map(r => r.round_listings)
      .filter(g => g && g.date < today && g.date >= cutoff) || []

    const allGames = [
      ...(hosted || []),
      ...joinedPast,
    ]

    if (!allGames.length) { setUnratedGames([]); return }

    // Check which ones I've already rated
    const gameIds = allGames.map(g => g.id)
    const { data: existingRatings } = await supabase
      .from('player_ratings')
      .select('listing_id')
      .eq('rater_id', user.id)
      .in('listing_id', gameIds)

    const ratedIds = new Set(existingRatings?.map(r => r.listing_id) || [])
    setUnratedGames(allGames.filter(g => !ratedIds.has(g.id)))
  }

  const openRateModal = async (game) => {
    const { data: reqs } = await supabase
      .from('round_requests')
      .select('profiles(id, name, avatar_url)')
      .eq('listing_id', game.id)
      .eq('status', 'accepted')

    const players = reqs?.map(r => r.profiles).filter(Boolean) || []
    const { data: host } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', game.host_id || user.id).single()
    if (host) players.push(host)

    setRatePlayers(players)
    setRateGame(game)
  }

  const fetchActivity = async () => {
    setLoading(true)
    try {

      const { data: myListings, error: listingsError } = await supabase
        .from('round_listings')
        .select('id, course_name, date')
        .eq('host_id', user.id)

      if (listingsError) throw listingsError

      const myListingIds = myListings?.map(l => l.id) || []
      const listingMap = {}
      myListings?.forEach(l => { listingMap[l.id] = l })

      const [
        { data: inboundRaw, error: inboundError },
        { data: outbound, error: outboundError },
      ] = await Promise.all([
        myListingIds.length
          ? supabase.from('round_requests')
              .select('id, status, created_at, listing_id, requester_id')
              .in('listing_id', myListingIds)
              .in('status', ['pending', 'accepted', 'declined'])
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] }),
        supabase.from('round_requests')
          .select('id, status, created_at, listing_id, invited_by, round_listings(id, course_name, date, tee_time, spots_total, spots_filled, is_active, profiles(name))')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (inboundError) throw inboundError
      if (outboundError) throw outboundError

      const requesterIds = [...new Set((inboundRaw || []).map(r => r.requester_id).filter(Boolean))]
      const { data: requesterProfiles, error: requesterProfilesError } = requesterIds.length
        ? await supabase
            .from('profiles')
            .select('id, name, avatar_url, handicap_range, avg_score, pace, cart_or_walk, home_course, location')
            .in('id', requesterIds)
        : { data: [] }

      if (requesterProfilesError) throw requesterProfilesError

      const profileMap = {}
      requesterProfiles?.forEach(p => { profileMap[p.id] = p })
      const inbound = (inboundRaw || []).map(r => ({ ...r, profiles: profileMap[r.requester_id] }))

      const events = []

      inbound?.forEach(r => {
        const listing = listingMap[r.listing_id]
        const name = r.profiles?.name?.split(' ')[0] || 'Someone'
        const course = listing?.course_name || 'your game'
        if (r.status === 'pending') {
          events.push({
            id: r.id,
            requestId: r.id,
            listingId: r.listing_id,
            requesterId: r.requester_id,
            ts: r.created_at,
            avatar: r.profiles,
            profile: r.profiles,
            emoji: '🙋',
            text: `${name} wants to join your game at ${course}`,
            type: 'inbound_pending',
          })
        } else if (r.status === 'accepted') {
          events.push({ id: r.id + '_acc', ts: r.created_at, avatar: r.profiles, emoji: '✅', text: `You accepted ${name} into your game at ${course}`, type: 'inbound_accepted' })
        } else if (r.status === 'declined') {
          events.push({ id: r.id + '_dec', ts: r.created_at, avatar: r.profiles, emoji: '❌', text: `You declined ${name}'s request for ${course}`, type: 'inbound_declined' })
        }
      })

      outbound?.forEach(r => {
        const course = r.round_listings?.course_name || 'a game'
        const hostName = r.round_listings?.profiles?.name?.split(' ')[0] || 'the host'
        if (r.status === 'invited') {
          events.push({
            id: r.id + '_inv',
            requestId: r.id,
            listingId: r.listing_id,
            listing: r.round_listings,
            ts: r.created_at,
            emoji: '🎉',
            text: `You were invited to play at ${course}`,
            type: 'invited',
          })
        } else if (r.status === 'pending') {
          events.push({ id: r.id + '_out', ts: r.created_at, emoji: '⏳', text: `Waiting on ${hostName} for your request to join ${course}`, type: 'outbound_pending' })
        } else if (r.status === 'accepted') {
          events.push({ id: r.id + '_oacc', ts: r.created_at, emoji: '⛳', text: `You're in! ${hostName} accepted your request to join ${course}`, type: 'outbound_accepted' })
        } else if (r.status === 'declined') {
          events.push({ id: r.id + '_odec', ts: r.created_at, emoji: '😔', text: `${hostName} declined your request to join ${course}`, type: 'outbound_declined' })
        }
      })

      events.sort((a, b) => new Date(b.ts) - new Date(a.ts))
      setItems(events)
    } catch (error) {
      console.error('Activity load failed', error)
      showToast('Could not load Activity. Pull down to refresh or try again.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchActivity()
      fetchUnratedGames()
    })
    const channel = supabase.channel('activity-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_requests' }, fetchActivity)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleAccept = async (item) => {
    setActingId(item.id)
    const { data: listing, error: listingLoadError } = await supabase
      .from('round_listings')
      .select('spots_total, spots_filled, course_name, date, tee_time, is_active')
      .eq('id', item.listingId)
      .single()

    if (listingLoadError || !listing) {
      showToast('Could not load this game.')
      setActingId(null)
      return
    }

    if (!listing.is_active || Number(listing.spots_filled || 0) >= Number(listing.spots_total || 0)) {
      showToast('This game is already full.')
      setActingId(null)
      fetchActivity()
      return
    }

    const { data: req, error } = await supabase
      .from('round_requests')
      .update({ status: 'accepted' })
      .eq('id', item.requestId)
      .eq('status', 'pending')
      .select('requester_id')
      .single()

    if (error) {
      showToast('This request was already handled.')
      setActingId(null)
      fetchActivity()
      return
    }

    const newFilled = Number(listing.spots_filled || 0) + 1
    const isFull = newFilled >= Number(listing.spots_total || 0)
    const { error: listingError } = await supabase
      .from('round_listings')
      .update({ spots_filled: newFilled, ...(isFull && { is_active: false }) })
      .eq('id', item.listingId)

    if (listingError) showToast(`Accepted, but game count failed: ${listingError.message}`)

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

    showToast('Request accepted.', 'success')
    setActingId(null)
    fetchActivity()
  }

  const handleDecline = async (item) => {
    setActingId(item.id)
    const { data: req } = await supabase
      .from('round_requests')
      .select('requester_id, round_listings(course_name, date)')
      .eq('id', item.requestId)
      .single()

    const { error } = await supabase
      .from('round_requests')
      .update({ status: 'declined' })
      .eq('id', item.requestId)

    if (error) {
      showToast('Failed to decline request.')
      setActingId(null)
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
    setActingId(null)
    fetchActivity()
  }

  const handleAcceptInvite = async (item) => {
    setActingId(item.id)
    const game = item.listing

    if (!game?.is_active || Number(game?.spots_filled || 0) >= Number(game?.spots_total || 0)) {
      showToast('That game is already full.')
      setActingId(null)
      fetchActivity()
      return
    }

    const { error: requestError } = await supabase
      .from('round_requests')
      .update({ status: 'accepted' })
      .eq('id', item.requestId)
      .eq('status', 'invited')
      .select('id')
      .single()

    if (requestError) {
      showToast('This invite was already handled.')
      setActingId(null)
      fetchActivity()
      return
    }

    const newFilled = Number(game.spots_filled || 1) + 1
    const isFull = newFilled >= Number(game.spots_total || 0)
    const { error: listingError } = await supabase
      .from('round_listings')
      .update({ spots_filled: newFilled, ...(isFull && { is_active: false }) })
      .eq('id', item.listingId)

    if (listingError) {
      showToast(`Invite accepted, but game count failed: ${listingError.message}`)
    } else {
      showToast('Invite accepted.', 'success')
    }

    setActingId(null)
    fetchActivity()
  }

  const handleDeclineInvite = async (item) => {
    setActingId(item.id)
    const { error } = await supabase
      .from('round_requests')
      .delete()
      .eq('id', item.requestId)
      .eq('status', 'invited')

    if (error) {
      showToast(`Could not decline invite: ${error.message}`)
      setActingId(null)
      return
    }

    showToast('Invite declined.', 'success')
    setActingId(null)
    fetchActivity()
  }

  const dotColor = (type) => {
    if (type.includes('accepted') || type === 'invited') return 'bg-green-400'
    if (type.includes('declined')) return 'bg-red-400'
    if (type === 'inbound_pending') return 'bg-orange-400'
    return 'bg-gray-300'
  }

  const pendingItems = items.filter(item => item.type === 'inbound_pending')
  const inviteItems = items.filter(item => item.type === 'invited')
  const updateItems = items.filter(item => item.type !== 'inbound_pending' && item.type !== 'invited')

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        <svg className="absolute right-4 top-6 opacity-10" width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">SwingSwipe</p>
        <h1 className="text-white text-2xl font-black mb-0.5">Activity 🔔</h1>
        <p className="text-white/70 text-xs mb-3">Requests, invites, and round updates</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Requests</p>
            <p className="text-sm font-black text-white">{pendingItems.length} pending</p>
          </div>
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Updates</p>
            <p className="text-sm font-black text-white">{updateItems.length} recent</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Rate prompts */}
        {unratedGames.length > 0 && (
          <div className="mb-4">
            {unratedGames.map(game => (
              <div key={game.id} className="card mb-3 p-4 border-l-4 border-yellow-400 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">⭐ Rate your round at {game.course_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
                  </p>
                </div>
                <button onClick={() => openRateModal(game)} className="shrink-0 bg-yellow-400 text-white font-bold text-xs px-3 py-2 rounded-[8px] active:opacity-80">
                  Rate now
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ActivityItemSkeleton key={i} />)
        ) : items.length === 0 && unratedGames.length === 0 ? (
          <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm text-center py-10 px-5">
            <div className="w-16 h-16 bg-[#1D9E75]/10 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">🔔</div>
            <p className="font-black text-gray-800 text-lg">No activity yet</p>
            <p className="text-sm text-gray-500 mt-2">Post a game or request to join one. Requests and updates will live here.</p>
          </div>
        ) : (
          <>
            {pendingItems.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Requests to review</p>
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{pendingItems.length}</span>
                </div>
                {pendingItems.map(item => (
                  <div key={item.id} className="bg-white border border-orange-100 rounded-[18px] p-4 shadow-sm mb-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={item.avatar?.name} url={item.avatar?.avatar_url} size={12} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 leading-snug">{item.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.ts)}</p>
                        <RequestTrustStrip profile={item.profile} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => handleDecline(item)}
                        disabled={actingId === item.id}
                        className="h-10 rounded-[12px] bg-gray-100 text-gray-500 text-sm font-black active:scale-[0.98] disabled:opacity-60 transition-transform"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => handleAccept(item)}
                        disabled={actingId === item.id}
                        className="h-10 rounded-[12px] bg-[#1D9E75] text-white text-sm font-black active:scale-[0.98] disabled:opacity-60 transition-transform"
                      >
                        {actingId === item.id ? 'Saving…' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inviteItems.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Invites to answer</p>
                  <span className="text-[10px] font-black text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-1 rounded-full">{inviteItems.length}</span>
                </div>
                {inviteItems.map(item => (
                  <div key={item.id} className="bg-white border border-[#1D9E75]/15 rounded-[18px] p-4 shadow-sm mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-xl shrink-0">{item.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 leading-snug">{item.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {timeAgo(item.ts)}
                          {item.listing?.date && ` · ${new Date(item.listing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                          {item.listing?.tee_time && ` · ${item.listing.tee_time.slice(0, 5)}`}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => handleDeclineInvite(item)}
                        disabled={actingId === item.id}
                        className="h-10 rounded-[12px] bg-gray-100 text-gray-500 text-sm font-black active:scale-[0.98] disabled:opacity-60 transition-transform"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAcceptInvite(item)}
                        disabled={actingId === item.id}
                        className="h-10 rounded-[12px] bg-[#1D9E75] text-white text-sm font-black active:scale-[0.98] disabled:opacity-60 transition-transform"
                      >
                        {actingId === item.id ? 'Saving…' : 'Accept invite'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {updateItems.length > 0 && (
              <div>
                <p className="section-label mb-3">Recent updates</p>
                <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {updateItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3">
                      <div className="relative shrink-0">
                        {item.avatar
                          ? <Avatar name={item.avatar.name} url={item.avatar.avatar_url} size={10} />
                          : <div className="w-10 h-10 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-xl">{item.emoji}</div>
                        }
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${dotColor(item.type)}`} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-gray-800 leading-snug">{item.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.ts)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {rateGame && (
        <RatePlayersModal
          listing={rateGame}
          currentUserId={user.id}
          players={ratePlayers}
          onClose={() => setRateGame(null)}
          onDone={() => {
            setUnratedGames(g => g.filter(x => x.id !== rateGame.id))
          }}
        />
      )}
    </div>
  )
}
