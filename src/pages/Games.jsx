import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'

const VIBE_LABELS = {
  casual: '😊 Casual',
  bread_game: '🍞 Bread game',
  competitive: '🏆 Competitive',
  fast_pace: '⚡ Fast pace',
  walking_only: '🚶 Walking only',
}

const RATING_TAGS = {
  positive: ['Fast pace', 'Great attitude', 'Competitive', 'Fun to play with', 'Punctual', 'Would play again'],
  negative: ['Slow player', 'No-show', 'Poor attitude', 'Not recommended'],
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
  )
}

function RatePlayersModal({ listing, currentUserId, players, onClose, onDone }) {
  const [ratings, setRatings] = useState({})
  const [saving, setSaving] = useState(false)

  const setRating = (playerId, key, val) => {
    setRatings(r => ({ ...r, [playerId]: { ...r[playerId], [key]: val } }))
  }

  const toggleTag = (playerId, tag) => {
    setRatings(r => {
      const tags = r[playerId]?.tags || []
      return {
        ...r,
        [playerId]: {
          ...r[playerId],
          tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag],
        },
      }
    })
  }

  const submit = async () => {
    setSaving(true)
    const inserts = Object.entries(ratings)
      .filter(([, r]) => r.stars)
      .map(([playerId, r]) => ({
        rater_id: currentUserId,
        rated_id: playerId,
        listing_id: listing.id,
        stars: r.stars,
        tags: r.tags || [],
      }))

    if (inserts.length) {
      await supabase.from('player_ratings').upsert(inserts, { onConflict: 'rater_id,rated_id,listing_id' })
    }
    setSaving(false)
    onDone()
    onClose()
  }

  const othersToRate = players.filter(p => p.id !== currentUserId)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-[24px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-black mb-1">Rate your playing partners</h2>
        <p className="text-sm text-gray-400 mb-5">Helps other golfers find great playing partners.</p>

        {othersToRate.map(player => (
          <div key={player.id} className="mb-6 pb-6 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={player.name} url={player.avatar_url} size={10} />
              <p className="font-bold">{player.name?.split(' ')[0]} {player.name?.split(' ')[1]?.[0]}.</p>
            </div>

            {/* Star rating */}
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(player.id, 'stars', star)}
                  className={`text-3xl transition-all ${(ratings[player.id]?.stars || 0) >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            {ratings[player.id]?.stars && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Add tags (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {[...RATING_TAGS.positive, ...RATING_TAGS.negative].map(tag => {
                    const isNeg = RATING_TAGS.negative.includes(tag)
                    const selected = ratings[player.id]?.tags?.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(player.id, tag)}
                        className={`pill text-xs py-1 transition-all ${
                          selected
                            ? isNeg ? 'bg-red-500 text-white' : 'bg-[#1D9E75] text-white'
                            : isNeg ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        <button onClick={submit} className="btn-primary" disabled={saving || Object.keys(ratings).length === 0}>
          {saving ? 'Saving…' : 'Submit ratings'}
        </button>
        <button onClick={onClose} className="w-full text-center text-sm text-gray-400 mt-3">Skip for now</button>
      </div>
    </div>
  )
}

function PostGameModal({ userId, onClose, onPosted }) {
  const [form, setForm] = useState({
    course_name: '', date: '', tee_time: '',
    spots_total: 3, vibe: 'casual', skill_range: 'all_welcome', notes: '',
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
      is_active: true,
    })
    setSaving(false)
    if (!error) { onPosted(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-[24px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-black mb-1">Post a game</h2>
        <p className="text-sm text-gray-400 mb-5">You booked the tee time — now find the right players.</p>

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
            <label className="text-xs text-gray-500 mb-2 block">Open spots needed</label>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => set('spots_total', n + 1)}
                  className={`pill flex-1 py-2 ${form.spots_total === n + 1 ? 'pill-active' : 'pill-inactive'}`}>
                  {n} {n === 1 ? 'player' : 'players'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Vibe</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(VIBE_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => set('vibe', val)}
                  className={`pill ${form.vibe === val ? 'pill-active' : 'pill-inactive'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Skill range</label>
            <div className="flex flex-wrap gap-2">
              {[['all_welcome', 'All welcome'], ['sub_100', 'Sub-100'], ['sub_90', 'Sub-90'], ['sub_80', 'Sub-80'], ['scratch', 'Scratch']].map(([val, label]) => (
                <button key={val} onClick={() => set('skill_range', val)}
                  className={`pill ${form.skill_range === val ? 'pill-active' : 'pill-inactive'}`}>{label}</button>
              ))}
            </div>
          </div>

          <textarea className="input-field resize-none" rows={2}
            placeholder="Notes — e.g. 'Walking round, bring cash for skins'" value={form.notes}
            onChange={e => set('notes', e.target.value)} />

          <button onClick={submit} className="btn-primary" disabled={saving || !form.course_name || !form.date || !form.tee_time}>
            {saving ? 'Posting…' : 'Post game ⛳'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Games({ user }) {
  const [tab, setTab] = useState('discover')
  const [myGames, setMyGames] = useState([])
  const [joinedGames, setJoinedGames] = useState([])
  const [pendingRequests, setPendingRequests] = useState({})
  const [loading, setLoading] = useState(true)
  const [showPost, setShowPost] = useState(false)
  const [chatGame, setChatGame] = useState(null)
  const [rateGame, setRateGame] = useState(null)
  const [ratePlayers, setRatePlayers] = useState([])

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
        const { data: reqs } = await supabase
          .from('round_requests')
          .select('*, profiles(id, name, avatar_url, handicap_range, vibe_tags, pace)')
          .in('listing_id', activeIds)
          .eq('status', 'pending')
        const reqMap = {}
        reqs?.forEach(r => {
          if (!reqMap[r.listing_id]) reqMap[r.listing_id] = []
          reqMap[r.listing_id].push(r)
        })
        setPendingRequests(reqMap)
      }
    }

    // Games I've joined
    const { data: joined } = await supabase
      .from('round_requests')
      .select('*, round_listings(*, profiles!round_listings_host_id_fkey(name, avatar_url))')
      .eq('requester_id', user.id)
      .eq('status', 'accepted')

    setMyGames(mine || [])
    setJoinedGames(joined?.map(j => j.round_listings).filter(Boolean) || [])
    setLoading(false)
  }

  const handleAccept = async (requestId, listingId) => {
    await supabase.from('round_requests').update({ status: 'accepted' }).eq('id', requestId)
    await supabase.from('round_listings').update({ spots_filled: supabase.rpc('increment', { x: 1 }) }).eq('id', listingId)
    fetchGames()
  }

  const handleDecline = async (requestId) => {
    await supabase.from('round_requests').update({ status: 'declined' }).eq('id', requestId)
    fetchGames()
  }

  const handleCloseGame = async (gameId) => {
    await supabase.from('round_listings').update({ is_active: false }).eq('id', gameId)
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

  const totalPending = Object.values(pendingRequests).reduce((a, b) => a + b.length, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        <h1 className="text-white text-xl font-black mb-3">Games ⛳</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('mine')}
            className={`pill flex-1 py-1.5 font-bold relative ${tab === 'mine' ? 'bg-white text-[#1D9E75]' : 'bg-white/20 text-white'}`}>
            My Games
            {totalPending > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{totalPending}</span>}
          </button>
          <button onClick={() => setTab('joined')}
            className={`pill flex-1 py-1.5 font-bold ${tab === 'joined' ? 'bg-white text-[#1D9E75]' : 'bg-white/20 text-white'}`}>
            Joined
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'mine' ? (
          <>
            {myGames.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-5xl mb-3">⛳</p>
                <p className="font-bold text-gray-700 text-lg">No games posted yet</p>
                <p className="text-sm text-gray-400 mt-2">Book a tee time, then post it here to find players.</p>
              </div>
            ) : (
              myGames.map(game => {
                const requests = pendingRequests[game.id] || []
                const past = isPast(game.date)
                return (
                  <div key={game.id} className="card mb-4 overflow-hidden">
                    <div className={`h-1.5 ${game.is_active && !past ? 'bg-[#1D9E75]' : 'bg-gray-300'}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-bold">{game.course_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
                          </p>
                        </div>
                        <span className={`pill text-xs ${game.is_active && !past ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {past ? 'Played' : game.is_active ? `${game.spots_total - game.spots_filled} spots left` : 'Closed'}
                        </span>
                      </div>

                      {/* Pending requests */}
                      {requests.length > 0 && (
                        <div className="mt-3 mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{requests.length} request{requests.length > 1 ? 's' : ''}</p>
                          {requests.map(req => (
                            <div key={req.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                              <Avatar name={req.profiles?.name} url={req.profiles?.avatar_url} size={9} />
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{req.profiles?.name?.split(' ')[0]} {req.profiles?.name?.split(' ')[1]?.[0]}.</p>
                                <p className="text-xs text-gray-400">{req.profiles?.handicap_range || 'No handicap listed'}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleDecline(req.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold">✕</button>
                                <button onClick={() => handleAccept(req.id, game.id)} className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold">✓</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setChatGame(game)} className="flex-1 py-2 bg-gray-100 rounded-[8px] text-sm font-semibold text-gray-700">
                          💬 Chat
                        </button>
                        {past ? (
                          <button onClick={() => openRateModal(game)} className="flex-1 py-2 bg-[#1D9E75]/10 rounded-[8px] text-sm font-semibold text-[#1D9E75]">
                            ⭐ Rate players
                          </button>
                        ) : game.is_active ? (
                          <button onClick={() => handleCloseGame(game.id)} className="flex-1 py-2 bg-gray-100 rounded-[8px] text-sm font-semibold text-gray-500">
                            Close game
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </>
        ) : (
          <>
            {joinedGames.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-5xl mb-3">🏌️</p>
                <p className="font-bold text-gray-700 text-lg">No games joined yet</p>
                <p className="text-sm text-gray-400 mt-2">Find open games in the Discover tab.</p>
              </div>
            ) : (
              joinedGames.map(game => (
                <div key={game.id} className="card mb-3 overflow-hidden">
                  <div className="h-1.5 bg-[#1D9E75]" />
                  <div className="p-4">
                    <p className="font-bold">{game.course_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 mb-3">
                      {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
                      {game.profiles?.name && ` · Hosted by ${game.profiles.name.split(' ')[0]}`}
                    </p>
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
            )}
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
