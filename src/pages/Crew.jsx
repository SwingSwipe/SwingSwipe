import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import RoundCard from '../components/RoundCard'
import PublicProfileModal from '../components/PublicProfileModal'
import ConfirmSheet from '../components/ConfirmSheet'
import Leaderboard from './Leaderboard'
import { showToast } from '../components/Toast'

const CREW_THEMES = {
  classic: {
    name: 'Classic',
    card: 'from-[#064e35] to-[#1D9E75]',
    room: 'from-[#f3fbf7] via-[#e8f5ef] to-[#f8fcfa]',
    soft: 'bg-[#e8f5ef] text-[#064e35]',
    button: 'bg-[#1D9E75] text-white',
    bubble: 'bg-[#1D9E75] text-white',
  },
  sunset: {
    name: 'Sunset',
    card: 'from-[#7c2d12] to-[#f97316]',
    room: 'from-[#fff7ed] via-[#ffedd5] to-[#fffaf5]',
    soft: 'bg-orange-50 text-orange-800',
    button: 'bg-orange-500 text-white',
    bubble: 'bg-orange-500 text-white',
  },
  navy: {
    name: 'Navy',
    card: 'from-[#0f172a] to-[#2563eb]',
    room: 'from-[#eff6ff] via-[#dbeafe] to-[#f8fbff]',
    soft: 'bg-blue-50 text-blue-900',
    button: 'bg-blue-600 text-white',
    bubble: 'bg-blue-600 text-white',
  },
  tournament: {
    name: 'Tournament',
    card: 'from-[#14532d] to-[#ca8a04]',
    room: 'from-[#f7fee7] via-[#fef9c3] to-[#fffdf2]',
    soft: 'bg-yellow-50 text-yellow-800',
    button: 'bg-yellow-600 text-white',
    bubble: 'bg-yellow-600 text-white',
  },
  night: {
    name: 'Night',
    card: 'from-[#111827] to-[#6d28d9]',
    room: 'from-[#f5f3ff] via-[#ede9fe] to-[#faf9ff]',
    soft: 'bg-violet-50 text-violet-900',
    button: 'bg-violet-600 text-white',
    bubble: 'bg-violet-600 text-white',
  },
  sand: {
    name: 'Sand',
    card: 'from-[#78350f] to-[#d97706]',
    room: 'from-[#fffbeb] via-[#fef3c7] to-[#fffdf5]',
    soft: 'bg-amber-50 text-amber-900',
    button: 'bg-amber-600 text-white',
    bubble: 'bg-amber-600 text-white',
  },
}

const CREW_ICONS = ['🤝', '⛳', '🏆', '🔥', '🍻', '🌙', '⚡', '🎯']
const getCrewTheme = (theme) => CREW_THEMES[theme] || CREW_THEMES.classic
const SYSTEM_MESSAGE_PREFIX = '__swingswipe_system__:'
const isSystemMessage = (message) => message?.content?.startsWith(SYSTEM_MESSAGE_PREFIX)
const systemMessageContent = (message) => message?.content?.replace(SYSTEM_MESSAGE_PREFIX, '') || ''

const logCrewActivity = (crewId, userId, content) => {
  if (!crewId || !userId || !content) return Promise.resolve()
  return supabase
    .from('crew_messages')
    .insert({ crew_id: crewId, user_id: userId, content: `${SYSTEM_MESSAGE_PREFIX}${content}` })
    .then(({ error }) => {
      if (error) console.warn('Crew activity log failed', error.message)
    })
}

const formatPinnedGameDate = (game) => {
  if (!game?.date) return 'Date TBD'
  const date = new Date(`${game.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return game.tee_time ? `${date} · ${game.tee_time}` : date
}

function PinnedGameCard({ game, compact = false }) {
  if (!game) return null
  const spotsTotal = game.spots_total || game.spots || 0
  const spotsLeft = Math.max(spotsTotal - (game.spots_filled || 0), 0)
  return (
    <div className={`rounded-[16px] bg-white/90 border border-white shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-black text-[#1D9E75] tracking-wide mb-0.5">Pinned game</p>
          <p className="font-black text-sm text-gray-900 truncate">{game.course_name || 'Golf round'}</p>
          <p className="text-xs text-gray-500">{formatPinnedGameDate(game)}</p>
        </div>
        <span className="shrink-0 text-[11px] font-black text-[#064e35] bg-[#e8f5ef] rounded-full px-2.5 py-1">{spotsLeft} left</span>
      </div>
      {game.profiles?.name && <p className="text-xs text-gray-400 mt-2">Hosted by {game.profiles.name}</p>}
    </div>
  )
}

function CrewChat({ crew, currentUserId, onClose, onPinGame, onUnpinGame }) {
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const theme = getCrewTheme(crew.theme)

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
    <div className={`fixed inset-0 bg-gradient-to-b ${theme.room} z-50 flex flex-col`}>
      <div className={`bg-gradient-to-r ${theme.card} text-white px-4 py-3 flex items-center gap-3`}>
        <button onClick={onClose} className="text-gray-400 text-lg">←</button>
        <div className="w-10 h-10 rounded-[12px] bg-white/20 flex items-center justify-center text-xl">{crew.icon || '🤝'}</div>
        <div>
          <p className="font-semibold text-sm">{crew.name}</p>
          <p className="text-xs text-white/70">{crew.tagline || 'Crew chat'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        <div className="pointer-events-none absolute -right-12 top-20 w-36 h-36 rounded-full bg-white/35" />
        <div className="pointer-events-none absolute -left-10 bottom-24 w-28 h-28 rounded-full bg-white/25" />
        <div className="relative z-10 space-y-2">
          {crew.pinnedGame ? <PinnedGameCard game={crew.pinnedGame} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onPinGame(crew)} className="h-9 rounded-[10px] bg-white/75 text-xs font-black text-gray-700 shadow-sm active:opacity-75">{crew.pinnedGame ? 'Change pinned game' : 'Pin a game'}</button>
            {crew.pinnedGame ? (
              <button onClick={() => onUnpinGame(crew)} className="h-9 rounded-[10px] bg-white/60 text-xs font-black text-red-500 shadow-sm active:opacity-75">Unpin</button>
            ) : (
              <button onClick={onClose} className="h-9 rounded-[10px] bg-white/60 text-xs font-black text-gray-500 shadow-sm active:opacity-75">Back</button>
            )}
          </div>
        </div>
        {messages.map(msg => {
          if (isSystemMessage(msg)) {
            return (
              <div key={msg.id} className="flex justify-center relative z-10">
                <div className="max-w-[85%] rounded-full bg-white/75 border border-white px-3 py-1.5 text-[11px] font-bold text-gray-500 text-center shadow-sm">
                  {systemMessageContent(msg)}
                </div>
              </div>
            )
          }

          const isMe = msg.user_id === currentUserId
          const sender = profiles[msg.user_id]
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%]`}>
                {!isMe && <p className="text-xs text-gray-400 mb-0.5">{sender?.name || 'Member'}</p>}
                <div className={`px-3 py-2 rounded-[12px] text-sm ${isMe ? theme.bubble : 'bg-white text-gray-800 border border-gray-100'}`}>
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

      <div className="p-4 bg-white/95 backdrop-blur border-t border-white/70 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send} className={`w-10 h-10 ${theme.button} rounded-[8px] flex items-center justify-center`}>↑</button>
      </div>
    </div>
    </Modal>
  )
}

function ManageCrewModal({ userId, onClose, onDone }) {
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
  const [theme, setTheme] = useState('classic')
  const [icon, setIcon] = useState('🤝')
  const [tagline, setTagline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const cleanName = name.trim().replace(/\s+/g, ' ')
  const cleanTagline = tagline.trim().slice(0, 80)
  const canSubmit = cleanName.length >= 2

  const updateName = (value) => {
    setName(value)
    if (error) setError('')
  }

  const join = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('id, name, created_by')
      .ilike('name', cleanName)
      .maybeSingle()

    if (crewError) {
      setError(`Could not search crews: ${crewError.message}`)
      setLoading(false)
      return
    }

    if (!crew) {
      setError(`No crew named "${cleanName}" yet. Switch to Create crew to make it.`)
      setLoading(false)
      return
    }

    const { data: existingMember } = await supabase
      .from('crew_members')
      .select('crew_id')
      .eq('crew_id', crew.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingMember) {
      setError('You are already in this crew.')
      setLoading(false)
      return
    }

    const { error: joinError } = await supabase
      .from('crew_join_requests')
      .insert({ crew_id: crew.id, requester_id: userId, status: 'pending' })

    if (joinError) {
      setError(joinError.code === '23505' ? 'You already requested to join this crew.' : `Could not request to join: ${joinError.message}`)
      setLoading(false)
      return
    }

    supabase.functions.invoke('send-push', {
      body: {
        user_id: crew.created_by,
        title: 'New crew request 🤝',
        body: `${crew.name} has someone waiting for approval.`,
      },
    })
    showToast(`Requested to join ${crew.name}.`, 'success')
    onDone()
    onClose()
    setLoading(false)
  }

  const create = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const { data: crew, error: createError } = await supabase
      .from('crews')
      .insert({ name: cleanName, created_by: userId, theme, icon, tagline: cleanTagline || null })
      .select('id, name')
      .single()

    if (createError) {
      setError(createError.code === '23505' ? 'A crew with that name already exists. Switch to Join existing.' : `Could not create crew: ${createError.message}`)
      setLoading(false)
      return
    }

    logCrewActivity(crew.id, userId, `${crew.name} was created`)
    showToast(`Created ${crew.name}. Share the name with friends.`, 'success')
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
            <p className="text-sm text-gray-500 mb-3">Join an existing crew by name. Ask a friend to share it from their crew card.</p>
            <div className="rounded-[12px] bg-[#e8f5ef] border border-[#d7eee5] p-3 mb-4">
              <p className="text-xs font-bold text-[#064e35]">How joining works</p>
              <p className="text-xs text-[#3d6b59] mt-1">Type the crew name exactly as your friend shared it. A member has to approve you before you join.</p>
            </div>
            <input className="input-field mb-3" placeholder="Crew name" value={name} onChange={e => updateName(e.target.value)} />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={join} className="btn-primary disabled:opacity-50" disabled={loading || !canSubmit}>{loading ? 'Sending…' : 'Request to join'}</button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">Create a named crew. Friends can join later by typing this exact name.</p>
            <div className="rounded-[12px] bg-[#e8f5ef] border border-[#d7eee5] p-3 mb-4">
              <p className="text-xs font-bold text-[#064e35]">How friends join</p>
              <p className="text-xs text-[#3d6b59] mt-1">After creating, tap Invite friends on the crew card to share the crew name.</p>
            </div>
            <input className="input-field mb-3" placeholder="Crew name (e.g. Saturday Boys)" value={name} onChange={e => updateName(e.target.value)} />
            <input className="input-field mb-3" placeholder="Tagline (optional)" value={tagline} maxLength={80} onChange={e => setTagline(e.target.value)} />
            <div className="mb-3">
              <p className="text-[10px] uppercase font-black text-gray-400 mb-2">Icon</p>
              <div className="grid grid-cols-8 gap-1.5">
                {CREW_ICONS.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setIcon(item)}
                    className={`h-9 rounded-[10px] text-lg ${icon === item ? 'bg-[#1D9E75] text-white' : 'bg-gray-100'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <p className="text-[10px] uppercase font-black text-gray-400 mb-2">Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CREW_THEMES).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`rounded-[12px] p-2 text-left border ${theme === key ? 'border-[#1D9E75]' : 'border-gray-100'}`}
                  >
                    <span className={`block h-8 rounded-[8px] bg-gradient-to-r ${item.card} mb-1`} />
                    <span className="text-xs font-black text-gray-700">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={create} className="btn-primary disabled:opacity-50" disabled={loading || !canSubmit}>{loading ? 'Creating…' : 'Create crew'}</button>
          </>
        )}
      </div>
    </>
    </Modal>
  )
}

function EditCrewModal({ crew, onClose, onDone }) {
  const [name, setName] = useState(crew.name || '')
  const [theme, setTheme] = useState(crew.theme || 'classic')
  const [icon, setIcon] = useState(crew.icon || '🤝')
  const [tagline, setTagline] = useState(crew.tagline || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const cleanName = name.trim().replace(/\s+/g, ' ')
  const cleanTagline = tagline.trim().slice(0, 80)
  const canSubmit = cleanName.length >= 2

  const save = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    const { data, error: updateError } = await supabase
      .from('crews')
      .update({ name: cleanName, theme, icon, tagline: cleanTagline || null })
      .eq('id', crew.id)
      .select('id, name, created_by, theme, icon, tagline')
      .single()

    if (updateError) {
      setError(`Could not update crew: ${updateError.message}`)
      setLoading(false)
      return
    }

    showToast('Crew updated.', 'success')
    logCrewActivity(crew.id, crew.created_by, 'Crew details were updated')
    onDone(data)
    onClose()
    setLoading(false)
  }

  return (
    <Modal>
      <>
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[20px] p-6 max-h-[88vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <h3 className="font-black text-lg text-gray-900 mb-1">Customize crew</h3>
          <p className="text-sm text-gray-500 mb-4">Give this crew a little personality.</p>
          <input className="input-field mb-3" placeholder="Crew name" value={name} onChange={e => setName(e.target.value)} />
          <input className="input-field mb-3" placeholder="Tagline (optional)" value={tagline} maxLength={80} onChange={e => setTagline(e.target.value)} />
          <div className="mb-3">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-2">Icon</p>
            <div className="grid grid-cols-8 gap-1.5">
              {CREW_ICONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  className={`h-9 rounded-[10px] text-lg ${icon === item ? 'bg-[#1D9E75] text-white' : 'bg-gray-100'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-2">Theme</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CREW_THEMES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={`rounded-[12px] p-2 text-left border ${theme === key ? 'border-[#1D9E75]' : 'border-gray-100'}`}
                >
                  <span className={`block h-8 rounded-[8px] bg-gradient-to-r ${item.card} mb-1`} />
                  <span className="text-xs font-black text-gray-700">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button onClick={save} className="btn-primary disabled:opacity-50 mb-2" disabled={loading || !canSubmit}>{loading ? 'Saving…' : 'Save crew'}</button>
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-400">Cancel</button>
        </div>
      </>
    </Modal>
  )
}

function PinGameModal({ crew, members, onClose, onPinned }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const theme = getCrewTheme(crew.theme)
  useEffect(() => {
    const fetchGames = async () => {
      const memberIds = members.map(m => m.user_id)
      if (!memberIds.length) { setGames([]); setLoading(false); return }
      const { data, error } = await supabase
        .from('round_listings')
        .select('id, course_name, date, tee_time, spots_total, spots_filled, host_id, profiles(name, avatar_url)')
        .in('host_id', memberIds)
        .eq('is_active', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
      if (error) showToast(`Could not load crew games: ${error.message}`)
      setGames(data || [])
      setLoading(false)
    }
    fetchGames()
  }, [crew.id])
  return (
    <Modal>
      <>
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[20px] p-6 max-h-[82vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className={`rounded-[16px] bg-gradient-to-r ${theme.card} p-4 text-white mb-4`}>
            <p className="text-[10px] uppercase font-black text-white/60 tracking-wide">Pin a game</p>
            <h3 className="font-black text-lg">{crew.name}</h3>
            <p className="text-xs text-white/70">Choose one upcoming crew game to keep at the top.</p>
          </div>
          {loading ? (
            <div className="h-28 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
          ) : games.length ? (
            <div className="space-y-2">{games.map(game => (<button key={game.id} onClick={() => onPinned(game)} className="w-full text-left active:opacity-75"><PinnedGameCard game={game} compact /></button>))}</div>
          ) : (
            <div className="text-center py-8"><p className="text-3xl mb-2">⛳</p><p className="font-black text-gray-800 text-sm">No crew games yet</p><p className="text-xs text-gray-500 mt-1">Post a game, then come back and pin it here.</p></div>
          )}
          <button onClick={onClose} className="w-full py-3 text-sm text-gray-400 mt-3">Cancel</button>
        </div>
      </>
    </Modal>
  )
}

function CrewMembersModal({ crew, members, currentUserId, onClose, onProfileTap }) {
  return (
    <Modal>
      <>
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[20px] p-6 max-h-[78vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-[14px] bg-gradient-to-r ${getCrewTheme(crew.theme).card} flex items-center justify-center text-2xl text-white`}>
              {crew.icon || '🤝'}
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900">{crew.name}</h3>
              <p className="text-xs text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-2">
            {members.map(member => {
              const profile = member.profile
              const isCreator = member.user_id === crew.created_by
              const isMe = member.user_id === currentUserId
              return (
                <button
                  key={member.user_id}
                  onClick={() => onProfileTap(member.user_id)}
                  className="w-full bg-gray-50 rounded-[14px] p-3 flex items-center gap-3 text-left active:opacity-75"
                >
                  <Avatar name={profile?.name} url={profile?.avatar_url} size={11} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">{profile?.name || 'Golfer'}{isMe ? ' · You' : ''}</p>
                    <p className="text-xs text-gray-400 truncate">{profile?.home_course || 'No home course'}</p>
                  </div>
                  {isCreator && <span className="text-[10px] font-black text-[#064e35] bg-[#e8f5ef] rounded-full px-2 py-1">Captain</span>}
                </button>
              )
            })}
          </div>

          <button onClick={onClose} className="w-full py-3 text-sm text-gray-400 mt-3">Close</button>
        </div>
      </>
    </Modal>
  )
}

export default function Crew({ user, userProfile, onFriendRequestsChange }) {
  const [crews, setCrews] = useState([])
  const [crewMembers, setCrewMembers] = useState({})
  const [friends, setFriends] = useState([])
  const [listings, setListings] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [crewJoinRequests, setCrewJoinRequests] = useState([])
  const [sentRequestIds, setSentRequestIds] = useState(new Set())
  const [friendIds, setFriendIds] = useState(new Set())
  const [requestedListings, setRequestedListings] = useState(new Set())
  const [viewingProfile, setViewingProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState(null)
  const [showCrewModal, setShowCrewModal] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [confirmDeleteCrew, setConfirmDeleteCrew] = useState(null)
  const [confirmLeaveCrew, setConfirmLeaveCrew] = useState(null)
  const [editingCrew, setEditingCrew] = useState(null)
  const [viewingCrewMembers, setViewingCrewMembers] = useState(null)
  const [pinningCrew, setPinningCrew] = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [crewMemberRes, friendRes, incomingRes, sentRes] = await Promise.all([
      supabase.from('crew_members').select('crew_id').eq('user_id', user.id),
      supabase.from('friends').select('friend_id').eq('user_id', user.id),
      supabase.from('friend_requests')
        .select('id, from_id, created_at, profiles!friend_requests_from_id_fkey(id, name, avatar_url, home_course)')
        .eq('to_id', user.id).eq('status', 'pending'),
      supabase.from('friend_requests').select('to_id').eq('from_id', user.id).eq('status', 'pending'),
    ])

    const myCrewIds = crewMemberRes.data?.map(r => r.crew_id) || []
    let crewList = []
    if (myCrewIds.length) {
      const { data: crewRows } = await supabase.from('crews').select('*').in('id', myCrewIds)
      crewList = crewRows || []
    }

    // Fetch member profiles for each crew
    if (crewList.length) {
      const { data: memberRows } = await supabase
        .from('crew_members')
        .select('crew_id, user_id')
        .in('crew_id', crewList.map(c => c.id))
      const memberProfileIds = [...new Set(memberRows?.map(r => r.user_id) || [])]
      const memberProfileMap = {}
      if (memberProfileIds.length) {
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, home_course')
          .in('id', memberProfileIds)
        memberProfiles?.forEach(p => { memberProfileMap[p.id] = p })
      }
      const membersByCrew = {}
      memberRows?.forEach(row => {
        if (!membersByCrew[row.crew_id]) membersByCrew[row.crew_id] = []
        membersByCrew[row.crew_id].push({ ...row, profile: memberProfileMap[row.user_id] })
      })
      crewList.forEach(c => { c.memberCount = membersByCrew[c.id]?.length || 1 })
      setCrewMembers(membersByCrew)
    } else {
      setCrewMembers({})
    }

    const pinnedIds = [...new Set(crewList.map(c => c.pinned_listing_id).filter(Boolean))]
    if (pinnedIds.length) {
      const { data: pinnedGames } = await supabase.from('round_listings').select('id, course_name, date, tee_time, spots_total, spots_filled, host_id, profiles(name, avatar_url)').in('id', pinnedIds)
      const pinnedMap = {}
      pinnedGames?.forEach(game => { pinnedMap[game.id] = game })
      crewList = crewList.map(c => ({ ...c, pinnedGame: pinnedMap[c.pinned_listing_id] || null }))
    }

    setCrews(crewList)

    if (crewList.length) {
      const { data: joinReqs } = await supabase
        .from('crew_join_requests')
        .select('id, crew_id, requester_id, status, created_at')
        .in('crew_id', crewList.map(c => c.id))
        .eq('status', 'pending')
        .neq('requester_id', user.id)
        .order('created_at', { ascending: true })

      const requesterIds = [...new Set(joinReqs?.map(r => r.requester_id) || [])]
      let profileMap = {}
      if (requesterIds.length) {
        const { data: requestProfiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, home_course')
          .in('id', requesterIds)
        requestProfiles?.forEach(p => { profileMap[p.id] = p })
      }
      const crewMap = {}
      crewList.forEach(c => { crewMap[c.id] = c })
      setCrewJoinRequests((joinReqs || []).map(r => ({
        ...r,
        crew: crewMap[r.crew_id],
        profile: profileMap[r.requester_id],
      })))
    } else {
      setCrewJoinRequests([])
    }

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

  const acceptCrewJoinRequest = async (req) => {
    const { error } = await supabase
      .from('crew_join_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id)
    if (error) { showToast(`Could not approve crew request: ${error.message}`); return }

    setCrewJoinRequests(r => r.filter(x => x.id !== req.id))
    await logCrewActivity(req.crew_id, user.id, `${req.profile?.name || 'A golfer'} joined the crew`)
    showToast(`${req.profile?.name || 'Player'} joined ${req.crew?.name || 'the crew'}.`, 'success')
    supabase.functions.invoke('send-push', {
      body: {
        user_id: req.requester_id,
        title: 'Crew request accepted 🤝',
        body: `You are now in ${req.crew?.name || 'the crew'}.`,
      },
    })
    fetchAll()
  }

  const declineCrewJoinRequest = async (req) => {
    const { error } = await supabase
      .from('crew_join_requests')
      .update({ status: 'declined' })
      .eq('id', req.id)
    if (error) { showToast(`Could not decline crew request: ${error.message}`); return }

    setCrewJoinRequests(r => r.filter(x => x.id !== req.id))
    showToast('Crew request declined.', 'success')
  }

  const deleteCrew = async () => {
    if (!confirmDeleteCrew) return

    const crewId = confirmDeleteCrew.id
    const { error } = await supabase
      .from('crews')
      .delete()
      .eq('id', crewId)
      .eq('created_by', user.id)

    if (error) {
      showToast(`Could not delete crew: ${error.message}`)
      return
    }

    setCrews(list => list.filter(c => c.id !== crewId))
    setCrewJoinRequests(reqs => reqs.filter(r => r.crew_id !== crewId))
    if (activeChat?.id === crewId) setActiveChat(null)
    setConfirmDeleteCrew(null)
    showToast('Crew deleted.', 'success')
  }

  const leaveCrew = async () => {
    if (!confirmLeaveCrew) return

    const crewId = confirmLeaveCrew.id
    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('crew_id', crewId)
      .eq('user_id', user.id)

    if (error) {
      showToast(`Could not leave crew: ${error.message}`)
      return
    }

    await logCrewActivity(crewId, user.id, `${userProfile?.name || 'A member'} left the crew`)
    setCrews(list => list.filter(c => c.id !== crewId))
    setCrewJoinRequests(reqs => reqs.filter(r => r.crew_id !== crewId))
    setCrewMembers(map => {
      const next = { ...map }
      delete next[crewId]
      return next
    })
    if (activeChat?.id === crewId) setActiveChat(null)
    if (viewingCrewMembers?.id === crewId) setViewingCrewMembers(null)
    setConfirmLeaveCrew(null)
    showToast('You left the crew.', 'success')
  }

  const handleCrewUpdated = (updatedCrew) => {
    setCrews(list => list.map(c => c.id === updatedCrew.id ? { ...c, ...updatedCrew } : c))
    setCrewJoinRequests(reqs => reqs.map(req => (
      req.crew_id === updatedCrew.id ? { ...req, crew: { ...req.crew, ...updatedCrew } } : req
    )))
    if (activeChat?.id === updatedCrew.id) setActiveChat({ ...activeChat, ...updatedCrew })
    if (viewingCrewMembers?.id === updatedCrew.id) setViewingCrewMembers({ ...viewingCrewMembers, ...updatedCrew })
  }

  const handlePinnedGameChanged = (crewId, pinnedGame) => {
    setCrews(list => list.map(c => c.id === crewId ? { ...c, pinned_listing_id: pinnedGame?.id || null, pinnedGame } : c))
    if (activeChat?.id === crewId) setActiveChat({ ...activeChat, pinned_listing_id: pinnedGame?.id || null, pinnedGame })
    if (pinningCrew?.id === crewId) setPinningCrew(null)
  }

  const pinCrewGame = async (crew, game) => {
    const { data, error } = await supabase.from('crews').update({ pinned_listing_id: game.id }).eq('id', crew.id).select('id, pinned_listing_id').single()
    if (error) { showToast(`Could not pin game: ${error.message}`); return }
    await logCrewActivity(crew.id, user.id, `${game.course_name || 'A game'} was pinned`)
    handlePinnedGameChanged(crew.id, { ...game, id: data.pinned_listing_id })
    showToast('Game pinned.', 'success')
  }

  const unpinCrewGame = async (crew) => {
    const { error } = await supabase.from('crews').update({ pinned_listing_id: null }).eq('id', crew.id)
    if (error) { showToast(`Could not unpin game: ${error.message}`); return }
    await logCrewActivity(crew.id, user.id, 'Pinned game was removed')
    handlePinnedGameChanged(crew.id, null)
    showToast('Pinned game removed.', 'success')
  }

  const getAddState = (id) => {
    if (friendIds.has(id)) return 'friends'
    if (sentRequestIds.has(id)) return 'sent'
    return 'add'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header pb-5">
        <svg className="absolute right-3 top-5 opacity-10" width="80" height="72" viewBox="0 0 80 72" fill="none">
          <circle cx="28" cy="18" r="12" fill="white"/>
          <path d="M4 60 Q4 40 28 40 Q52 40 52 60" fill="white"/>
          <circle cx="56" cy="20" r="10" fill="white"/>
          <path d="M36 62 Q40 44 56 44 Q72 44 76 62" fill="white"/>
        </svg>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Your people</p>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white text-2xl font-black mb-0.5">Crew 🤝</h1>
            <p className="text-white/70 text-xs">Friends, groups and who's playing</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowLeaderboard(true)} className="text-sm bg-white/20 text-white px-3 py-1.5 rounded-[10px] font-bold">
              🏆
            </button>
            <button onClick={() => setShowCrewModal(true)} className="text-sm bg-white text-[#1D9E75] px-3 py-1.5 rounded-[10px] font-bold shadow-sm">
              + Crew
            </button>
          </div>
        </div>
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
      </div>

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

            {/* Crew join requests */}
            {crewJoinRequests.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="section-label">Crew requests</h2>
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{crewJoinRequests.length} waiting</span>
                </div>
                <div className="space-y-2">
                  {crewJoinRequests.map(req => {
                    const p = req.profile
                    return (
                      <div key={req.id} className="bg-white rounded-[18px] border border-orange-100 shadow-sm p-3">
                        <button className="w-full flex items-center gap-3 text-left active:opacity-75" onClick={() => setViewingProfile(req.requester_id)}>
                          <Avatar name={p?.name} url={p?.avatar_url} size={11} />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-gray-900">{p?.name || 'Golfer'}</p>
                            <p className="text-xs text-gray-400 truncate">Wants to join {req.crew?.name || 'your crew'}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold">View →</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button onClick={() => declineCrewJoinRequest(req)}
                            className="h-10 bg-gray-100 text-gray-500 rounded-[12px] text-sm font-black active:scale-[0.98] transition-transform">
                            Decline
                          </button>
                          <button onClick={() => acceptCrewJoinRequest(req)}
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
                    <div key={crew.id} className={`rounded-[20px] shadow-sm overflow-hidden bg-gradient-to-r ${getCrewTheme(crew.theme).card}`}>
                      <div className="p-4 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-[14px] bg-white/20 flex items-center justify-center text-2xl">{crew.icon || '🤝'}</div>
                          <div>
                            <p className="font-black text-base">{crew.name}</p>
                            <p className="text-xs text-white/70">{crew.tagline || `${crew.memberCount || 1} member${crew.memberCount !== 1 ? 's' : ''}`}</p>
                          </div>
                        </div>
                        <button onClick={() => setActiveChat(crew)}
                          className="text-sm bg-white text-gray-900 px-3 py-2 rounded-[10px] font-black">
                          Chat
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                        <span>{crew.memberCount || 1} member{crew.memberCount !== 1 ? 's' : ''}</span>
                        <span>{getCrewTheme(crew.theme).name} theme</span>
                      </div>
                      <button
                        onClick={() => setViewingCrewMembers(crew)}
                        className="w-full flex items-center justify-between bg-white/14 rounded-[12px] px-3 py-2 mb-2 active:opacity-75"
                      >
                        <div className="flex -space-x-2">
                          {(crewMembers[crew.id] || []).slice(0, 4).map(member => (
                            <div key={member.user_id} className="ring-2 ring-white/40 rounded-full">
                              <Avatar name={member.profile?.name} url={member.profile?.avatar_url} size={8} />
                            </div>
                          ))}
                          {(crewMembers[crew.id] || []).length === 0 && (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">?</div>
                          )}
                        </div>
                        <span className="text-xs font-black text-white">View members →</span>
                      </button>
                      {crew.pinnedGame && (<div className="mb-2"><PinnedGameCard game={crew.pinnedGame} compact /></div>)}
                      <button onClick={() => setPinningCrew(crew)} className="w-full text-xs text-white font-black bg-white/18 rounded-[10px] py-2 mb-2 active:opacity-70">{crew.pinnedGame ? 'Change pinned game' : 'Pin crew game'}</button>
                      {crew.created_by === user.id && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button
                            onClick={() => setEditingCrew(crew)}
                            className="w-full text-xs text-white font-black bg-white/18 rounded-[10px] py-2 active:opacity-70"
                          >
                            Customize
                          </button>
                          <button
                            onClick={() => setConfirmDeleteCrew(crew)}
                            className="w-full text-xs text-white font-black bg-red-500/75 rounded-[10px] py-2 active:opacity-70"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {crew.created_by !== user.id && (
                        <button
                          onClick={() => setConfirmLeaveCrew(crew)}
                          className="w-full text-xs text-white font-black bg-red-500/70 rounded-[10px] py-2 mb-2 active:opacity-70"
                        >
                          Leave crew
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const text = `Join my crew "${crew.name}" on SwingSwipe ⛳\n\nOpen SwingSwipe → Crew tab → tap "+ Crew" → Join crew → type: ${crew.name}`
                          if (navigator.share) navigator.share({ title: `Join ${crew.name} on SwingSwipe`, text })
                          else navigator.clipboard?.writeText(crew.name).then(() => showToast('Crew name copied.', 'success'))
                        }}
                        className="w-full text-xs text-white font-black bg-white/18 rounded-[10px] py-2 flex items-center justify-center gap-1.5 active:opacity-70"
                      >
                        🔗 Invite friends — share crew name
                      </button>
                      </div>
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

      {activeChat && (<CrewChat crew={activeChat} currentUserId={user.id} onClose={() => setActiveChat(null)} onPinGame={crew => setPinningCrew(crew)} onUnpinGame={unpinCrewGame} />)}
      {showCrewModal && <ManageCrewModal userId={user.id} onClose={() => setShowCrewModal(false)} onDone={fetchAll} />}
      {editingCrew && (
        <EditCrewModal
          crew={editingCrew}
          onClose={() => setEditingCrew(null)}
          onDone={handleCrewUpdated}
        />
      )}
      {pinningCrew && (<PinGameModal crew={pinningCrew} members={crewMembers[pinningCrew.id] || []} onClose={() => setPinningCrew(null)} onPinned={game => pinCrewGame(pinningCrew, game)} />)}
      {viewingCrewMembers && (
        <CrewMembersModal
          crew={viewingCrewMembers}
          members={crewMembers[viewingCrewMembers.id] || []}
          currentUserId={user.id}
          onClose={() => setViewingCrewMembers(null)}
          onProfileTap={id => {
            setViewingCrewMembers(null)
            setViewingProfile(id)
          }}
        />
      )}
      {confirmDeleteCrew && (
        <ConfirmSheet
          title="Delete this crew?"
          message={`This removes ${confirmDeleteCrew.name}, its chat, requests and membership for everyone.`}
          confirmLabel="Delete crew"
          danger
          onConfirm={deleteCrew}
          onCancel={() => setConfirmDeleteCrew(null)}
        />
      )}
      {confirmLeaveCrew && (
        <ConfirmSheet
          title="Leave this crew?"
          message={`You will leave ${confirmLeaveCrew.name}. The crew stays open for everyone else.`}
          confirmLabel="Leave crew"
          danger
          onConfirm={leaveCrew}
          onCancel={() => setConfirmLeaveCrew(null)}
        />
      )}
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
