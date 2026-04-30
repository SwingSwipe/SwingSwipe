import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import RoundCard from '../components/RoundCard'

const VIBES = ['all', 'casual', 'bread_game', 'competitive', 'fast_pace', 'walking_only']
const VIBE_LABELS = {
  all: 'All vibes',
  casual: 'Casual',
  bread_game: '🍞 Bread game',
  competitive: '🏆 Competitive',
  fast_pace: '⚡ Fast pace',
  walking_only: '🚶 Walking',
}

function RoundChat({ listing, currentUserId, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [profiles, setProfiles] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('round_messages')
        .select('*')
        .eq('listing_id', listing.id)
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
      .channel(`chat-${listing.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'round_messages',
        filter: `listing_id=eq.${listing.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        if (payload.new.user_id !== currentUserId) {
          supabase.from('profiles').select('id,name,avatar_url').eq('id', payload.new.user_id).single()
            .then(({ data }) => {
              if (data) setProfiles(prev => ({ ...prev, [data.id]: data }))
            })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [listing.id, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!text.trim()) return
    await supabase.from('round_messages').insert({
      listing_id: listing.id,
      user_id: currentUserId,
      content: text.trim(),
    })
    setText('')
  }

  return (
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col">
      <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="text-gray-400">←</button>
        <div>
          <p className="font-semibold text-sm">{listing.course_name}</p>
          <p className="text-xs text-gray-400">{listing.date} · Round chat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.user_id === currentUserId
          const sender = profiles[msg.user_id]
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? '' : 'flex gap-2 items-end'}`}>
                {!isMe && (
                  <p className="text-xs text-gray-400 mb-0.5">{sender?.name || 'User'}</p>
                )}
                <div
                  className={`px-3 py-2 rounded-[12px] text-sm ${
                    isMe ? 'bg-[#1D9E75] text-white' : 'bg-white text-gray-800 border border-gray-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="w-10 h-10 bg-[#1D9E75] rounded-[8px] flex items-center justify-center text-white"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

function PostRoundModal({ userId, onClose, onPosted }) {
  const [form, setForm] = useState({
    course_name: '', date: '', tee_time: '',
    spots_total: 4, vibe: 'casual', skill_range: 'all_welcome', notes: '',
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
      vibe: form.vibe,
      skill_range: form.skill_range,
      notes: form.notes || null,
    })
    setSaving(false)
    if (!error) { onPosted(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-[20px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Post a Round</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>

        <div className="space-y-4">
          <input className="input-field" placeholder="Course name" value={form.course_name} onChange={e => set('course_name', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
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
            <label className="text-xs text-gray-500 mb-2 block">Total spots</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => set('spots_total', n)}
                  className={`pill flex-1 ${form.spots_total === n ? 'pill-active' : 'pill-inactive'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Vibe</label>
            <div className="flex flex-wrap gap-2">
              {['casual', 'bread_game', 'competitive', 'fast_pace', 'walking_only'].map(v => (
                <button key={v} onClick={() => set('vibe', v)}
                  className={`pill ${form.vibe === v ? 'pill-active' : 'pill-inactive'}`}>
                  {VIBE_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Skill range</label>
            <div className="flex flex-wrap gap-2">
              {['all_welcome', 'sub_100', 'sub_90', 'sub_80', 'scratch'].map(s => (
                <button key={s} onClick={() => set('skill_range', s)}
                  className={`pill ${form.skill_range === s ? 'pill-active' : 'pill-inactive'}`}>
                  {s.replace('_', ' ').replace('sub', 'Sub-')}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />

          <button onClick={submit} className="btn-primary" disabled={saving}>
            {saving ? 'Posting…' : 'Post Round'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Groups({ user }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVibe, setActiveVibe] = useState('all')
  const [showPost, setShowPost] = useState(false)
  const [chatListing, setChatListing] = useState(null)
  const [joinStatus, setJoinStatus] = useState({})

  const fetchListings = async () => {
    setLoading(true)
    let query = supabase
      .from('round_listings')
      .select('*, profiles(name, avatar_url)')
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('tee_time', { ascending: true })

    if (activeVibe !== 'all') query = query.eq('vibe', activeVibe)

    const { data } = await query
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [activeVibe])

  const handleJoin = async (listing) => {
    const { data: existing } = await supabase
      .from('round_requests')
      .select('id, status')
      .eq('listing_id', listing.id)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (existing) {
      setJoinStatus(s => ({ ...s, [listing.id]: existing.status }))
      return
    }

    const { error } = await supabase.from('round_requests').insert({
      listing_id: listing.id,
      requester_id: user.id,
    })
    if (!error) setJoinStatus(s => ({ ...s, [listing.id]: 'pending' }))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold mb-3">Groups</h1>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {VIBES.map(v => (
            <button
              key={v}
              onClick={() => setActiveVibe(v)}
              className={`pill whitespace-nowrap ${activeVibe === v ? 'pill-active' : 'pill-inactive'}`}
            >
              {VIBE_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-4xl mb-3">⛳</p>
            <p className="font-semibold text-gray-700">No rounds posted yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to post a round!</p>
          </div>
        ) : (
          listings.map(listing => (
            <div key={listing.id}>
              <RoundCard
                listing={listing}
                currentUserId={user.id}
                onJoin={handleJoin}
                onChat={setChatListing}
              />
              {joinStatus[listing.id] === 'pending' && (
                <p className="text-xs text-[#1D9E75] text-center -mt-2 mb-3">Request sent!</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowPost(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#1D9E75] rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-40"
      >
        +
      </button>

      {showPost && (
        <PostRoundModal userId={user.id} onClose={() => setShowPost(false)} onPosted={fetchListings} />
      )}

      {chatListing && (
        <RoundChat listing={chatListing} currentUserId={user.id} onClose={() => setChatListing(null)} />
      )}
    </div>
  )
}
