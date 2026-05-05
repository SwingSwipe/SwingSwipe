import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import RoundCard from '../components/RoundCard'
import PublicProfileModal from '../components/PublicProfileModal'
import Leaderboard from './Leaderboard'
import HeroHeader from '../components/HeroHeader'
import { showToast } from '../components/Toast'

function CrewChat({ crew, currentUserId, onClose }) {
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('crew_messages')
        .select('*')
        .eq('crew_id', crew.id)
        .order('created_at', { ascending: true })
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
    fetchMessages()

    const channel = supabase
      .channel(`crew-chat-${crew.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'crew_messages',
        filter: `crew_id=eq.${crew.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        supabase.from('profiles').select('id,name,avatar_url').eq('id', payload.new.user_id).single()
          .then(({ data }) => { if (data) setProfiles(prev => ({ ...prev, [data.id]: data })) })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [crew.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim()) return
    await supabase.from('crew_messages').insert({ crew_id: crew.id, user_id: currentUserId, content: text.trim() })
    setText('')
  }

  return (
    <Modal>
    <div className="fixed inset-0 bg-[#f0f2f0] z-50 flex flex-col">
      <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="text-gray-400 text-lg">←</button>
        <div>
          <p className="font-semibold text-sm">{crew.name}</p>
          <p className="text-xs text-gray-400">Crew chat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.user_id === currentUserId
          const sender = profiles[msg.user_id]
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%]`}>
                {!isMe && <p className="text-xs text-gray-400 mb-0.5">{sender?.name || 'Member'}</p>}
                <div className={`px-3 py-2 rounded-[12px] text-sm ${isMe ? 'bg-[#1D9E75] text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm text-gray-400">Start the trash talk</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send} className="w-10 h-10 bg-[#1D9E75] rounded-[8px] flex items-center justify-center text-white">↑</button>
      </div>
    </div>
    </Modal>
  )
}

function ManageCrewModal({ userId, onClose, onDone }) {
  const [tab, setTab] = useState('join')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const join = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const { data: crew } = await supabase
      .from('crews')
      .select('id')
      .ilike('name', name.trim())
      .single()

    if (!crew) { setError('Crew not found. Check the name and try again.'); setLoading(false); return }

    const { error: joinError } = await supabase
      .from('crew_members')
      .insert({ crew_id: crew.id, user_id: userId })

    if (joinError) { setError('Already in this crew or something went wrong.'); setLoading(false); return }

    onDone()
    onClose()
    setLoading(false)
  }

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const { data: crew, error: createError } = await supabase
      .from('crews')
      .insert({ name: name.trim(), created_by: userId })
      .select('id')
      .single()

    if (createError) { setError('A crew with that name may already exist.'); setLoading(false); return }

    await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: userId })
    onDone()
    onClose()
    setLoading(false)
  }

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[20px] p-6">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex gap-2 mb-5">
          <button onClick={() => { setTab('create'); setError('') }}
            className={`pill flex-1 py-1.5 font-bold ${tab === 'create' ? 'pill-active' : 'pill-inactive'}`}>
            Create crew
          </button>
          <button onClick={() => { setTab('join'); setError('') }}
            className={`pill flex-1 py-1.5 font-bold ${tab === 'join' ? 'pill-active' : 'pill-inactive'}`}>
            Join crew
          </button>
        </div>
        {tab === 'join' ? (
          <>
            <p className="text-sm text-gray-500 mb-4">Ask your friend for their crew name and enter it below.</p>
            <input className="input-field mb-3" placeholder="Crew name" value={name} onChange={e => setName(e.target.value)} />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={join} className="btn-primary" disabled={loading}>{loading ? 'Joining…' : 'Join Crew'}</button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">Create a crew and share the name with your playing partners so they can join.</p>
            <input className="input-field mb-3" placeholder="Crew name (e.g. Saturday Boys)" value={name} onChange={e => setName(e.target.value)} />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={create} className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Crew ⛳'}</button>
          </>
        )}
      </div>
    </>
    </Modal>
  )
}

export default function Crew({ user, userProfile, onFriendRequestsChange }) {
  const [crews, setCrews] = useState([])
  const [friends, setFriends] = useState([])
  const [listings, setListings] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [sentRequestIds, setSentRequestIds] = useState(new Set())
  const [friendIds, setFriendIds] = useState(new Set())
  const [requestedListings, setRequestedListings] = useState(new Set())
  const [viewingProfile, setViewingProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState(null)
  const [showCrewModal, setShowCrewModal] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [crewRes, friendRes, incomingRes, sentRes] = await Promise.all([
      supabase.from('crew_members').select('crew_id, crews(id, name, created_by)').eq('user_id', user.id),
      supabase.from('friends').select('friend_id').eq('user_id', user.id),
      supabase.from('friend_requests')
        .select('id, from_id, created_at, profiles!friend_requests_from_id_fkey(id, name, avatar_url, home_course)')
        .eq('to_id', user.id).eq('status', 'pending'),
      supabase.from('friend_requests').select('to_id').eq('from_id', user.id).eq('status', 'pending'),
    ])

    const crewList = crewRes.data?.map(r => r.crews).filter(Boolean) || []

    // Fetch member counts for each crew
    if (crewList.length) {
      const { data: counts } = await supabase
        .from('crew_members')
        .select('crew_id')
        .in('crew_id', crewList.map(c => c.id))
      const countMap = {}
      counts?.forEach(r => { countMap[r.crew_id] = (countMap[r.crew_id] || 0) + 1 })
      crewList.forEach(c => { c.memberCount = countMap[c.id] || 1 })
    }

    setCrews(crewList)

    const ids = friendRes.data?.map(f => f.friend_id) || []
    setFriendIds(new Set(ids))
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      setFriends(profiles || [])
      const { data: friendListings } = await supabase
        .from('round_listings').select('*, profiles(name, avatar_url)')
        .in('host_id', ids).eq('is_active', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
      // Track which friend listings I've already requested or been accepted to
      if (!friendListings?.length) {
        setListings([])
      } else {
        const { data: myReqs } = await supabase
          .from('round_requests').select('listing_id, status')
          .eq('requester_id', user.id)
          .in('listing_id', friendListings.map(l => l.id))
        const acceptedIds = new Set(myReqs?.filter(r => r.status === 'accepted').map(r => r.listing_id) || [])
        const pendingIds = new Set(myReqs?.filter(r => r.status === 'pending').map(r => r.listing_id) || [])
        setListings(friendListings.filter(l => !acceptedIds.has(l.id)))
        setRequestedListings(pendingIds)
      }
    } else {
      setFriends([])
      setListings([])
    }

    const incoming = incomingRes.data || []
    setIncomingRequests(incoming)
    setSentRequestIds(new Set(sentRes.data?.map(r => r.to_id) || []))
    onFriendRequestsChange?.(incoming.length)
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, home_course')
      .ilike('name', `%${search}%`)
      .neq('id', user.id)
      .limit(10)
    setSearchResults(data || [])
  }

  const handleJoinRequest = async (listing) => {
    const { error } = await supabase.from('round_requests').insert({
      listing_id: listing.id,
      requester_id: user.id,
      status: 'pending',
    })
    if (!error) {
      setRequestedListings(s => new Set([...s, listing.id]))
      const requesterName = userProfile?.name?.split(' ')[0] || 'Someone'
      const date = new Date(listing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      supabase.functions.invoke('send-push', {
        body: {
          user_id: listing.host_id,
          title: `${requesterName} wants to join your game ⛳`,
          body: `${listing.course_name} · ${date}`,
        },
      })
    } else {
      showToast('Could not request this game. Try again.')
    }
  }

  const handleCancelJoinRequest = async (listing) => {
    const { error } = await supabase
      .from('round_requests')
      .delete()
      .eq('listing_id', listing.id)
      .eq('requester_id', user.id)
    if (!error) {
      setRequestedListings(s => {
        const next = new Set(s)
        next.delete(listing.id)
        return next
      })
    } else {
      showToast('Could not cancel request. Try again.')
    }
  }

  const sendRequest = async (toId) => {
    const { error } = await supabase.from('friend_requests').insert({ from_id: user.id, to_id: toId, status: 'pending' })
    if (error) { showToast('Could not send friend request.'); return }
    setSentRequestIds(s => new Set([...s, toId]))
    const senderName = userProfile?.name?.split(' ')[0] || 'Someone'
    supabase.functions.invoke('send-push', {
      body: {
        user_id: toId,
        title: `${senderName} added you on SwingSwipe 🤝`,
        body: 'Tap to view their profile and accept.',
      },
    })
  }

  const acceptRequest = async (req) => {
    const { error: acceptError } = await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id)
    if (acceptError) { showToast('Could not accept request.'); return }
    const { error: friendError } = await supabase.from('friends').insert([
      { user_id: user.id, friend_id: req.from_id },
      { user_id: req.from_id, friend_id: user.id },
    ])
    if (friendError) { showToast('Could not add friend.'); return }
    const myName = userProfile?.name?.split(' ')[0] || 'Someone'
    supabase.functions.invoke('send-push', {
      body: {
        user_id: req.from_id,
        title: `${myName} accepted your friend request 🤝`,
        body: 'You can now see each other\'s games and crew.',
      },
    })
    fetchAll()
  }

  const declineRequest = async (reqId) => {
    const { error } = await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', reqId)
    if (error) { showToast('Could not decline request.'); return }
    setIncomingRequests(r => r.filter(x => x.id !== reqId))
    onFriendRequestsChange?.(incomingRequests.length - 1)
  }

  const getAddState = (id) => {
    if (friendIds.has(id)) return 'friends'
    if (sentRequestIds.has(id)) return 'sent'
    return 'add'
  }

  return (
    <div className="flex flex-col h-full">
      <HeroHeader
        eyebrow="Your people"
        title="Crew"
        subtitle="Friends, groups and who's playing"
        icon="🤝"
        action={(
          <div className="flex gap-2">
            <button onClick={() => setShowLeaderboard(true)} className="text-sm bg-white/20 text-white px-3 py-1.5 rounded-[10px] font-bold">
              🏆
            </button>
            <button onClick={() => setShowCrewModal(true)} className="text-sm bg-white text-[#1D9E75] px-3 py-1.5 rounded-[10px] font-bold shadow-sm">
              + Crew
            </button>
          </div>
        )}
      >
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Friends</p>
            <p className="text-sm font-black text-white">{friends.length}</p>
          </div>
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Crews</p>
            <p className="text-sm font-black text-white">{crews.length}</p>
          </div>
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Games</p>
            <p className="text-sm font-black text-white">{listings.length}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            className="w-full border-0 rounded-[10px] px-4 py-2.5 text-sm focus:outline-none bg-white/90"
            placeholder="Search golfers by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="px-4 py-2.5 bg-white text-[#1D9E75] rounded-[10px] text-sm font-bold shadow-sm">Find</button>
        </div>
      </HeroHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-5">
            <h2 className="section-label mb-2">Results</h2>
            <div className="space-y-2">
              {searchResults.map(p => {
                const state = getAddState(p.id)
                return (
                  <div key={p.id} className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                    <button onClick={() => setViewingProfile(p.id)} className="shrink-0 active:opacity-75">
                      <Avatar name={p.name} url={p.avatar_url} size={11} />
                    </button>
                    <button onClick={() => setViewingProfile(p.id)} className="flex-1 min-w-0 text-left active:opacity-75">
                      <p className="font-black text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.home_course || 'No home course'}</p>
                    </button>
                    {state === 'friends' ? (
                      <span className="text-xs text-[#1D9E75] font-semibold px-3 py-1.5">✓ Friends</span>
                    ) : state === 'sent' ? (
                      <span className="text-xs text-gray-400 font-semibold px-3 py-1.5">Requested</span>
                    ) : (
                      <button onClick={() => sendRequest(p.id)} className="text-xs bg-[#1D9E75] text-white px-3 py-2 rounded-[10px] font-black">
                        + Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Friend requests inbox */}
            {incomingRequests.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="section-label">Friend requests</h2>
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{incomingRequests.length} pending</span>
                </div>
                <div className="space-y-2">
                  {incomingRequests.map(req => {
                    const p = req.profiles
                    return (
                      <div key={req.id} className="bg-white rounded-[18px] border border-orange-100 shadow-sm p-3">
                        <button className="w-full flex items-center gap-3 text-left active:opacity-75" onClick={() => setViewingProfile(req.from_id)}>
                          <Avatar name={p?.name} url={p?.avatar_url} size={11} />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-gray-900">{p?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{p?.home_course || 'No home course'}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold">View →</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button onClick={() => declineRequest(req.id)}
                            className="h-10 bg-gray-100 text-gray-500 rounded-[12px] text-sm font-black active:scale-[0.98] transition-transform">
                            Decline
                          </button>
                          <button onClick={() => acceptRequest(req)}
                            className="h-10 bg-[#1D9E75] text-white rounded-[12px] text-sm font-black active:scale-[0.98] transition-transform">
                            Accept
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Crews */}
            {crews.length > 0 && (
              <div className="mb-5">
                <h2 className="section-label mb-2">Your crews</h2>
                <div className="space-y-2">
                  {crews.map(crew => (
                    <div key={crew.id} className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[12px] bg-[#1D9E75]/10 flex items-center justify-center text-xl">🤝</div>
                          <div>
                            <p className="font-black text-sm text-gray-900">{crew.name}</p>
                            <p className="text-xs text-gray-400">{crew.memberCount || 1} member{crew.memberCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <button onClick={() => setActiveChat(crew)}
                          className="text-sm bg-[#1D9E75] text-white px-3 py-2 rounded-[10px] font-black">
                          Chat
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const text = `Join my crew "${crew.name}" on SwingSwipe ⛳\n\nOpen SwingSwipe → Crew tab → tap "+ Crew" → Join crew → type: ${crew.name}`
                          if (navigator.share) navigator.share({ title: `Join ${crew.name} on SwingSwipe`, text })
                          else navigator.clipboard?.writeText(crew.name).then(() => showToast('Crew name copied.', 'success'))
                        }}
                        className="w-full text-xs text-[#064e35] font-black bg-[#1D9E75]/10 rounded-[10px] py-2 flex items-center justify-center gap-1.5 active:opacity-70"
                      >
                        🔗 Invite friends — share crew name
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playing this week */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="section-label">Friends playing</h2>
                {listings.length > 0 && <span className="text-[10px] font-black text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-1 rounded-full">{listings.length}</span>}
              </div>
              {listings.length > 0 ? (
                listings.map(l => (
                  <RoundCard
                    key={l.id}
                    listing={l}
                    currentUserId={user.id}
                    onJoin={handleJoinRequest}
                    onCancel={handleCancelJoinRequest}
                    onHostTap={id => setViewingProfile(id)}
                    requested={requestedListings.has(l.id)}
                  />
                ))
              ) : (
                <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-5 text-center">
                  <div className="w-14 h-14 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">⛳</div>
                  <p className="font-black text-gray-800 text-sm">No friend games open</p>
                  <p className="text-xs text-gray-500 mt-1">Invite friends or post a game so this feed starts moving.</p>
                </div>
              )}
            </div>

            {/* Friends list */}
            <div>
              <h2 className="section-label mb-3">Golf crew</h2>
              {friends.length === 0 ? (
                <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm text-center py-8 px-5">
                  <div className="w-14 h-14 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🏌️</div>
                  <p className="font-black text-gray-800">No friends yet</p>
                  <p className="text-sm text-gray-500 mt-1">Search for golfers above or create a crew to start inviting people.</p>
                </div>
              ) : (
                <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-3">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                  {friends.map(f => (
                    <button key={f.id} onClick={() => setViewingProfile(f.id)} className="flex flex-col items-center gap-1.5 min-w-[60px] active:opacity-70">
                      <Avatar name={f.name} url={f.avatar_url} size={12} />
                      <p className="text-xs text-center text-gray-600 leading-tight max-w-[60px] truncate">
                        {f.name?.split(' ')[0]}
                      </p>
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {activeChat && <CrewChat crew={activeChat} currentUserId={user.id} onClose={() => setActiveChat(null)} />}
      {showCrewModal && <ManageCrewModal userId={user.id} onClose={() => setShowCrewModal(false)} onDone={fetchAll} />}
      {viewingProfile && <PublicProfileModal userId={viewingProfile} currentUserId={user.id} onClose={() => setViewingProfile(null)} />}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 bg-[#f0f2f0] flex flex-col">
          <button onClick={() => setShowLeaderboard(false)}
            className="absolute top-12 left-4 z-10 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white text-lg">
            ←
          </button>
          <Leaderboard user={user} profile={userProfile} />
        </div>
      )}
    </div>
  )
}
