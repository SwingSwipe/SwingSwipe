import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'

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

  useEffect(() => {
    fetchActivity()
    const channel = supabase.channel('activity-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_requests' }, fetchActivity)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchActivity = async () => {
    setLoading(true)

    // Requests on MY listings
    const { data: myListings } = await supabase
      .from('round_listings')
      .select('id, course_name, date')
      .eq('host_id', user.id)

    const myListingIds = myListings?.map(l => l.id) || []
    const listingMap = {}
    myListings?.forEach(l => { listingMap[l.id] = l })

    const [{ data: inbound }, { data: outbound }] = await Promise.all([
      myListingIds.length
        ? supabase.from('round_requests')
            .select('id, status, created_at, listing_id, requester_id, profiles(id, name, avatar_url)')
            .in('listing_id', myListingIds)
            .in('status', ['pending', 'accepted', 'declined'])
            .order('created_at', { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] }),
      supabase.from('round_requests')
        .select('id, status, created_at, listing_id, invited_by, round_listings(course_name, date, profiles(name))')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const events = []

    // Inbound requests on my games
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

    // Outbound — my requests and invites
    outbound?.forEach(r => {
      const course = r.round_listings?.course_name || 'a game'
      const hostName = r.round_listings?.profiles?.name?.split(' ')[0] || 'the host'
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
    setLoading(false)
  }

  const dotColor = (type) => {
    if (type.includes('accepted') || type === 'invited') return 'bg-green-400'
    if (type.includes('declined')) return 'bg-red-400'
    if (type === 'inbound_pending') return 'bg-orange-400'
    return 'bg-gray-300'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        <svg className="absolute right-4 top-6 opacity-10" width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">SwingSwipe</p>
        <h1 className="text-white text-2xl font-black mb-0.5">Activity 🔔</h1>
        <p className="text-white/70 text-xs">Your recent notifications</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-5xl mb-3">🔔</p>
            <p className="font-bold text-gray-700 text-lg">No activity yet</p>
            <p className="text-sm text-gray-400 mt-2">Post a game or request to join one — notifications will appear here.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-start gap-3 mb-4">
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
    </div>
  )
}
