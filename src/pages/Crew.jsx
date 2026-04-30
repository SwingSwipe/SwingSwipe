import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import RoundCard from '../components/RoundCard'

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
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col">
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
  )
}

function JoinCrewModal({ userId, onClose, onJoined }) {
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

    onJoined()
    onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-[20px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Join a Crew</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Ask your friend for their crew name and enter it below.</p>
        <input
          className="input-field mb-3"
          placeholder="Crew name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <button onClick={join} className="btn-primary" disabled={loading}>
          {loading ? 'Joining…' : 'Join Crew'}
        </button>
      </div>
    </div>
  )
}

export default function Crew({ user }) {
  const [crews, setCrews] = useState([])
  const [friends, setFriends] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState(null)
  const [showJoin, setShowJoin] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [crewRes, friendRes] = await Promise.all([
      supabase.from('crew_members').select('crew_id, crews(id, name, created_by)').eq('user_id', user.id),
      supabase.from('friends').select('friend_id').eq('user_id', user.id),
    ])

    const crewList = crewRes.data?.map(r => r.crews).filter(Boolean) || []
    setCrews(crewList)

    const friendIds = friendRes.data?.map(f => f.friend_id) || []
    if (friendIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds)
      setFriends(profiles || [])

      const { data: friendListings } = await supabase
        .from('round_listings')
        .select('*, profiles(name, avatar_url)')
        .in('host_id', friendIds)
        .eq('is_active', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
      setListings(friendListings || [])
    }
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

  const addFriend = async (friendId) => {
    const { data: existing } = await supabase.from('friends').select('id').eq('user_id', user.id).eq('friend_id', friendId).maybeSingle()
    if (existing) return
    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: friendId },
      { user_id: friendId, friend_id: user.id },
    ])
    fetchAll()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Crew</h1>
          <button onClick={() => setShowJoin(true)} className="text-sm bg-[#1D9E75] text-white px-3 py-1.5 rounded-[8px] font-semibold">
            Join crew
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Search golfers by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="px-4 py-3 bg-[#1D9E75] text-white rounded-[8px] text-sm font-semibold">Find</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {searchResults.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Results</h2>
            <div className="space-y-2">
              {searchResults.map(p => (
                <div key={p.id} className="card p-3 flex items-center gap-3">
                  <Avatar name={p.name} url={p.avatar_url} size={10} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.home_course || 'No home course'}</p>
                  </div>
                  <button onClick={() => addFriend(p.id)} className="text-xs bg-[#1D9E75] text-white px-3 py-1.5 rounded-[8px] font-semibold">Add</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Crews */}
            {crews.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Your crews</h2>
                <div className="space-y-2">
                  {crews.map(crew => (
                    <div key={crew.id} className="card p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{crew.name}</p>
                        <p className="text-xs text-gray-400">Tap to open chat</p>
                      </div>
                      <button
                        onClick={() => setActiveChat(crew)}
                        className="text-sm bg-[#1D9E75] text-white px-3 py-1.5 rounded-[8px] font-semibold"
                      >
                        Chat 💬
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playing this week */}
            {listings.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Playing this week</h2>
                {listings.map(l => <RoundCard key={l.id} listing={l} currentUserId={user.id} />)}
              </div>
            )}

            {/* Friends list */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Golf crew</h2>
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🏌️</p>
                  <p className="font-semibold text-gray-700">No friends yet</p>
                  <p className="text-sm text-gray-400 mt-1">Search for golfers above to add them.</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {friends.map(f => (
                    <div key={f.id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                      <Avatar name={f.name} url={f.avatar_url} size={12} />
                      <p className="text-xs text-center text-gray-600 leading-tight max-w-[60px] truncate">
                        {f.name?.split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {activeChat && <CrewChat crew={activeChat} currentUserId={user.id} onClose={() => setActiveChat(null)} />}
      {showJoin && <JoinCrewModal userId={user.id} onClose={() => setShowJoin(false)} onJoined={fetchAll} />}
    </div>
  )
}
