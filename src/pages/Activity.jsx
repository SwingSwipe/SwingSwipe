import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import { ActivityItemSkeleton } from '../components/Skeleton'
import RatePlayersModal from '../components/RatePlayersModal'
import HeroHeader from '../components/HeroHeader'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
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
  const [error, setError] = useState('')
  const [unratedGames, setUnratedGames] = useState([])
  const [rateGame, setRateGame] = useState(null)
  const [ratePlayers, setRatePlayers] = useState([])

  useEffect(() => {
    fetchActivity()
    fetchUnratedGames()
    const channel = supabase.channel('activity-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_requests' }, fetchActivity)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchUnratedGames = async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const cutoff = sevenDaysAgo.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      const [{ data: hosted, error: hostedError }, { data: joined, error: joinedError }] = await Promise.all([
        supabase
          .from('round_listings')
          .select('id, course_name, date, tee_time, host_id')
          .eq('host_id', user.id)
          .lt('date', today)
          .gte('date', cutoff),
        supabase
          .from('round_requests')
          .select('listing_id, round_listings(id, course_name, date, tee_time, host_id)')
          .eq('requester_id', user.id)
          .eq('status', 'accepted'),
      ])

      if (hostedError || joinedError) {
        setUnratedGames([])
        return
      }

      const joinedPast = joined
        ?.map(r => Array.isArray(r.round_listings) ? r.round_listings[0] : r.round_listings)
        .filter(g => g && g.date < today && g.date >= cutoff) || []

      const allGames = [
        ...(hosted || []),
        ...joinedPast,
      ]

      if (!allGames.length) { setUnratedGames([]); return }

      const gameIds = allGames.map(g => g.id).filter(Boolean)
      if (!gameIds.length) { setUnratedGames([]); return }

      const { data: existingRatings } = await supabase
        .from('player_ratings')
        .select('listing_id')
        .eq('rater_id', user.id)
        .in('listing_id', gameIds)

      const ratedIds = new Set(existingRatings?.map(r => r.listing_id) || [])
      setUnratedGames(allGames.filter(g => !ratedIds.has(g.id)))
    } catch {
      setUnratedGames([])
    }
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
    setError('')

    try {
      const { data: myListings, error: listingsError } = await supabase
        .from('round_listings')
        .select('id, course_name, date')
        .eq('host_id', user.id)

      if (listingsError) throw listingsError

      const myListingIds = myListings?.map(l => l.id).filter(Boolean) || []
      const listingMap = {}
      myListings?.forEach(l => { listingMap[l.id] = l })

      const [{ data: inbound, error: inboundError }, { data: outbound, error: outboundError }] = await Promise.all([
        myListingIds.length
          ? supabase.from('round_requests')
              .select('id, status, created_at, listing_id, requester_id, profiles(id, name, avatar_url)')
              .in('listing_id', myListingIds)
              .in('status', ['pending', 'accepted', 'declined'])
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('round_requests')
          .select('id, status, created_at, listing_id, invited_by, round_listings(course_name, date, profiles(name))')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (inboundError || outboundError) throw inboundError || outboundError

      const events = []

      inbound?.forEach(r => {
        const listing = listingMap[r.listing_id]
        const name = r.profiles?.name?.split(' ')[0] || 'Someone'
        const course = listing?.course_name || 'your game'
        if (r.status === 'pending') {
          events.push({ id: r.id, ts: r.created_at, avatar: r.profiles, emoji: '🙋', text: `${name} wants to join your game at ${course}`, type: 'inbound_pending' })
        } else if (r.status === 'accepted') {
          events.push({ id: r.id + '_acc', ts: r.created_at, avatar: r.profiles, emoji: '✅', text: `You accepted ${name} into your game at ${course}`, type: 'inbound_accepted' })
        } else if (r.status === 'declined') {
          events.push({ id: r.id + '_dec', ts: r.created_at, avatar: r.profiles, emoji: '❌', text: `You declined ${name}'s request for ${course}`, type: 'inbound_declined' })
        }
      })

      outbound?.forEach(r => {
        const listing = Array.isArray(r.round_listings) ? r.round_listings[0] : r.round_listings
        const course = listing?.course_name || 'a game'
        const host = Array.isArray(listing?.profiles) ? listing.profiles[0] : listing?.profiles
        const hostName = host?.name?.split(' ')[0] || 'the host'
        if (r.status === 'invited') {
          events.push({ id: r.id + '_inv', ts: r.created_at, emoji: '🎉', text: `You were invited to play at ${course}`, type: 'invited' })
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
    } catch (e) {
      setItems([])
      setError(e?.message || 'Activity could not load.')
    } finally {
      setLoading(false)
    }
  }

  const dotColor = (type) => {
    if (type?.includes('accepted') || type === 'invited') return 'bg-green-400'
    if (type?.includes('declined')) return 'bg-red-400'
    if (type === 'inbound_pending') return 'bg-orange-400'
    return 'bg-gray-300'
  }

  return (
    <div className="flex flex-col h-full">
      <HeroHeader
        eyebrow="SwingSwipe"
        title="Activity"
        subtitle="Requests, invites, reminders, and ratings"
        icon="🔔"
        compact
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Rate prompts */}
        {unratedGames.length > 0 && (
          <div className="mb-4">
            {unratedGames.map(game => (
              <div key={game.id} className="card card-press mb-3 p-4 border-l-4 border-yellow-400 flex items-center justify-between gap-3">
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
        ) : error ? (
          <div className="text-center py-14 px-5">
            <p className="text-5xl mb-3">🔔</p>
            <p className="font-bold text-gray-700 text-lg">Activity could not load</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <button onClick={fetchActivity} className="mt-5 bg-[#1D9E75] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm active:opacity-80">
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-5xl mb-3">🔔</p>
            <p className="font-bold text-gray-700 text-lg">No activity yet</p>
            <p className="text-sm text-gray-400 mt-2">Post a game or request to join one — notifications will appear here.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="card p-3 flex items-start gap-3 mb-3">
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
          ))
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
