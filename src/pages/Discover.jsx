import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import ConfirmSheet from '../components/ConfirmSheet'
import PublicProfileModal from '../components/PublicProfileModal'

const HANDICAP_LABELS = {
  beginner: 'Beginner',
  '90s': '90s shooter',
  '80s': '80s shooter',
  '70s': '70s shooter',
  scratch: 'Scratch',
}

const PACE_LABELS = {
  fast: '⚡ Fast',
  moderate: '🚶 Moderate',
  relaxed: '😌 Relaxed',
}

const GAME_PACE_LABELS = {
  quick: '⚡ Quick (~3h)',
  normal: '⏱ Normal (~4h)',
  relaxed: '☕ Relaxed (4.5h+)',
}

const TRANSPORT_LABELS = {
  cart: '🛺 Cart',
  walk: '🚶 Walk',
  either: '🔄 Either',
}

const VIBE_LABELS = {
  bread_game: '🍞 Bread game',
  casual: '😊 Casual',
  competitive: '🏆 Competitive',
  social: '🤝 Social',
  practice_focused: '🎯 Practice focused',
}

function StarRating({ score, count }) {
  if (!score || count < 3) return <span className="text-xs text-gray-400">New player</span>
  return (
    <div className="flex items-center gap-1">
      <span className="text-yellow-400 text-sm">{'★'.repeat(Math.round(score))}{'☆'.repeat(5 - Math.round(score))}</span>
      <span className="text-xs text-gray-500">{score.toFixed(1)} ({count})</span>
    </div>
  )
}

function PlayerCard({ player, onTap }) {
  return (
    <div onClick={() => onTap(player)} className="card feed-card p-4 mb-3 cursor-pointer active:opacity-80">
      <div className="flex items-start gap-3">
        <Avatar name={player.name} url={player.avatar_url} size={14} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-[15px]">{player.name?.split(' ')[0]} {player.name?.split(' ')[1]?.[0]}.</p>
              <p className="text-xs text-gray-400 mt-0.5">📍 {player.home_course || player.location || 'No home course'}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="pill bg-[#1D9E75]/10 text-[#1D9E75] text-xs font-bold px-2 py-1">
                {HANDICAP_LABELS[player.handicap_range] || player.handicap_range || '?'}
              </span>
            </div>
          </div>

          <div className="mt-2">
            <StarRating score={player.avg_rating} count={player.rating_count || 0} />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {player.pace && (
              <span className="pill bg-blue-50 text-blue-600 text-xs py-0.5">{PACE_LABELS[player.pace] || player.pace}</span>
            )}
            {player.cart_or_walk && player.cart_or_walk !== 'either' && (
              <span className="pill bg-gray-100 text-gray-600 text-xs py-0.5">
                {player.cart_or_walk === 'cart' ? '🛺 Cart' : '🚶 Walking'}
              </span>
            )}
            {player.vibe_tags?.slice(0, 2).map(tag => (
              <span key={tag} className="pill bg-green-50 text-green-700 text-xs py-0.5">{VIBE_LABELS[tag] || tag}</span>
            ))}
          </div>

          {player.availability?.length > 0 && (
            <p className="text-xs text-gray-400 mt-1.5">
              📅 {player.availability.slice(0, 2).map(a => a.replace('_', ' ')).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const SKILL_MEETS = {
  beginner: new Set(['all_welcome']),
  '90s':    new Set(['all_welcome', 'sub_100']),
  '80s':    new Set(['all_welcome', 'sub_100', 'sub_90']),
  '70s':    new Set(['all_welcome', 'sub_100', 'sub_90', 'sub_80']),
  scratch:  new Set(['all_welcome', 'sub_100', 'sub_90', 'sub_80', 'scratch']),
}

function GameCard({ game, currentUserId, userHandicap, onRequest, onCancel, onWithdraw, onHostTap, requestStatus, acceptedPlayers }) {
  const spotsLeft = game.spots_total - game.spots_filled
  const isOwn = game.host_id === currentUserId
  const status = requestStatus[game.id]
  const mismatch = game.skill_range && game.skill_range !== 'all_welcome' && userHandicap
    && !SKILL_MEETS[userHandicap]?.has(game.skill_range)

  return (
    <div className="card mb-3 overflow-hidden">
      <div className="h-1.5 bg-[#1D9E75]" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-sm">{game.course_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
            </p>
          </div>
          <div className="text-right">
            <span className={`pill text-xs font-bold ${spotsLeft > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left` : 'Full'}
            </span>
          </div>
        </div>

        <button
          onClick={() => !isOwn && onHostTap?.(game.host_id)}
          className={`flex items-start gap-2.5 mb-3 w-full text-left ${!isOwn ? 'active:opacity-70' : ''}`}
        >
          <Avatar name={game.profiles?.name} url={game.profiles?.avatar_url} size={8} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">{game.profiles?.name?.split(' ')[0]} {game.profiles?.name?.split(' ')[1]?.[0]}.</p>
              {game.profiles?.rating?.count >= 3 && (
                <span className="text-yellow-400 text-[10px]">{'★'.repeat(Math.round(game.profiles.rating.avg))}</span>
              )}
              {game.vibe && (
                <span className="pill bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 ml-auto shrink-0">
                  {VIBE_LABELS[game.vibe] || game.vibe}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {game.profiles?.pace && (
                <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  {PACE_LABELS[game.profiles.pace] || game.profiles.pace}
                </span>
              )}
              {game.profiles?.cart_or_walk && game.profiles.cart_or_walk !== 'either' && (
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {game.profiles.cart_or_walk === 'cart' ? '🛺 Cart' : '🚶 Walking'}
                </span>
              )}
              {game.profiles?.cart_or_walk === 'either' && (
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">🛺/🚶 Either</span>
              )}
              {game.profiles?.handicap_range && (
                <span className="text-[10px] font-semibold text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-0.5 rounded-full">
                  {HANDICAP_LABELS[game.profiles.handicap_range] || game.profiles.handicap_range}
                </span>
              )}
              {!isOwn && <span className="text-[10px] text-gray-400 ml-auto">tap to view →</span>}
            </div>
          </div>
        </button>

        {/* Accepted players */}
        {acceptedPlayers?.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-1.5">
              {acceptedPlayers.slice(0, 4).map(p => (
                <Avatar key={p.id} name={p.name} url={p.avatar_url} size={6} />
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {acceptedPlayers.length === 1
                ? `${acceptedPlayers[0].name?.split(' ')[0]} joined`
                : `${acceptedPlayers.length} players joined`}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {game.holes && (
            <span className="pill bg-gray-100 text-gray-600 text-xs py-0.5">{game.holes} holes</span>
          )}
          {game.transport && (
            <span className="pill bg-gray-100 text-gray-600 text-xs py-0.5">{TRANSPORT_LABELS[game.transport] || game.transport}</span>
          )}
          {game.pace && (
            <span className="pill bg-orange-50 text-orange-600 text-xs py-0.5">{GAME_PACE_LABELS[game.pace] || game.pace}</span>
          )}
        </div>

        {game.skill_range && game.skill_range !== 'all_welcome' && (
          <p className={`text-xs mb-3 ${mismatch ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
            {mismatch ? '⚠️' : '🎯'} {game.skill_range.replace('_', ' ').replace('sub', 'Sub-')} players
            {mismatch && ' — outside your level'}
          </p>
        )}

        {game.notes && (
          <p className="text-xs text-gray-500 italic mb-3">"{game.notes}"</p>
        )}

        {!isOwn && (
          status === 'accepted' ? (
            <div className="flex gap-2">
              <div className="flex-1 py-2.5 rounded-[10px] text-sm font-bold bg-green-100 text-green-700 text-center">
                ✓ You're in!
              </div>
              <button
                onClick={() => onWithdraw(game)}
                className="px-4 py-2.5 rounded-[10px] text-sm font-bold bg-red-50 text-red-500 active:opacity-80"
              >
                Withdraw
              </button>
            </div>
          ) : status === 'pending' ? (
            <div className="flex gap-2">
              <div className="flex-1 py-2.5 rounded-[10px] text-sm font-bold bg-gray-100 text-gray-500 text-center">
                ✓ Request sent
              </div>
              <button
                onClick={() => onCancel(game)}
                className="px-4 py-2.5 rounded-[10px] text-sm font-bold bg-red-50 text-red-500 active:opacity-80"
              >
                Cancel
              </button>
            </div>
          ) : spotsLeft > 0 ? (
            <button
              onClick={() => onRequest(game)}
              className="w-full py-2.5 rounded-[10px] text-sm font-bold bg-[#1D9E75] text-white active:opacity-80"
            >
              Request to join →
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-[10px] text-sm font-bold bg-gray-100 text-gray-400 text-center">Full</div>
          )
        )}
        {isOwn && (
          <p className="text-xs text-[#1D9E75] font-semibold text-center">Your game</p>
        )}
      </div>
    </div>
  )
}

function PlayerModal({ player, currentUserId, onClose, onMessage }) {
  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="flex items-start gap-4 mb-5">
          <Avatar name={player.name} url={player.avatar_url} size={16} />
          <div className="flex-1">
            <p className="font-black text-xl">{player.name?.split(' ')[0]} {player.name?.split(' ')[1]?.[0]}.</p>
            <p className="text-sm text-gray-400">📍 {player.home_course || player.location || 'Location not set'}</p>
            <div className="mt-1">
              <StarRating score={player.avg_rating} count={player.rating_count || 0} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="card p-3 text-center">
            <p className="font-bold text-[#1D9E75]">{HANDICAP_LABELS[player.handicap_range] || '?'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Skill level</p>
          </div>
          <div className="card p-3 text-center">
            <p className="font-bold text-[#1D9E75]">{player.avg_score || '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Avg score</p>
          </div>
        </div>

        <div className="mb-5">
          <p className="section-label mb-2">Vibe</p>
          <div className="flex flex-wrap gap-2">
            {player.pace && <span className="pill bg-blue-50 text-blue-600">{PACE_LABELS[player.pace]}</span>}
            {player.cart_or_walk && <span className="pill bg-gray-100 text-gray-700">
              {player.cart_or_walk === 'cart' ? '🛺 Cart' : player.cart_or_walk === 'walking' ? '🚶 Walking' : '🛺/🚶 Either'}
            </span>}
            {player.vibe_tags?.map(tag => (
              <span key={tag} className="pill bg-green-50 text-green-700">{VIBE_LABELS[tag] || tag}</span>
            ))}
          </div>
        </div>

        {player.availability?.length > 0 && (
          <div className="mb-5">
            <p className="section-label mb-2">Availability</p>
            <div className="flex flex-wrap gap-2">
              {player.availability.map(a => (
                <span key={a} className="pill bg-gray-100 text-gray-600 capitalize">{a.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {player.bio_prompt && (
          <div className="bg-gray-50 rounded-[12px] p-3 mb-5">
            <p className="text-xs text-gray-400 mb-1">Best course I've played</p>
            <p className="text-sm font-semibold">{player.bio_prompt}</p>
          </div>
        )}

        {player.id !== currentUserId && (
          <button onClick={() => onMessage(player)} className="btn-primary">
            Invite to a game
          </button>
        )}
      </div>
    </>
    </Modal>
  )
}

export default function Discover({ user, userProfile }) {
  const [mode, setMode] = useState('players')
  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [requestStatus, setRequestStatus] = useState({})
  const [gamePlayers, setGamePlayers] = useState({})
  const [filters, setFilters] = useState({ handicap: 'all', pace: 'all', holes: 'all', gamePace: 'all' })
  const [confirmWithdraw, setConfirmWithdraw] = useState(null)

  useEffect(() => {
    if (mode === 'players') fetchPlayers()
    else fetchGames()
  }, [mode, filters])

  const fetchPlayers = async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*, avg_rating:player_ratings(stars.avg()), rating_count:player_ratings(count)')
      .neq('id', user.id)
      .not('name', 'is', null)

    if (filters.handicap !== 'all') query = query.eq('handicap_range', filters.handicap)
    if (filters.pace !== 'all') query = query.eq('pace', filters.pace)

    const { data } = await query.limit(30)

    // Flatten aggregates
    const enriched = (data || []).map(p => ({
      ...p,
      avg_rating: p.avg_rating?.[0]?.avg ?? null,
      rating_count: p.rating_count?.[0]?.count ?? 0,
    }))

    setPlayers(enriched)
    setLoading(false)
  }

  const fetchGames = async () => {
    setLoading(true)
    let query = supabase
      .from('round_listings')
      .select('*, profiles(id, name, avatar_url, pace, cart_or_walk, handicap_range)')
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('tee_time', { ascending: true })

    if (filters.holes !== 'all') query = query.eq('holes', parseInt(filters.holes))
    if (filters.gamePace !== 'all') query = query.eq('pace', filters.gamePace)

    const { data } = await query

    if (data?.length) {
      const ids = data.map(g => g.id)
      const hostIds = [...new Set(data.map(g => g.host_id))]

      const [{ data: reqs }, { data: accepted }, { data: ratings }] = await Promise.all([
        supabase.from('round_requests').select('listing_id, status').eq('requester_id', user.id).in('listing_id', ids),
        supabase.from('round_requests').select('listing_id, profiles(id, name, avatar_url)').in('listing_id', ids).eq('status', 'accepted'),
        supabase.from('player_ratings').select('rated_id, stars').in('rated_id', hostIds),
      ])

      const statusMap = {}
      reqs?.forEach(r => { statusMap[r.listing_id] = r.status })
      setRequestStatus(statusMap)

      const playersMap = {}
      accepted?.forEach(r => {
        if (!r.profiles) return
        if (!playersMap[r.listing_id]) playersMap[r.listing_id] = []
        playersMap[r.listing_id].push(r.profiles)
      })
      setGamePlayers(playersMap)

      // Build host rating map
      const ratingMap = {}
      ratings?.forEach(r => {
        if (!ratingMap[r.rated_id]) ratingMap[r.rated_id] = { total: 0, count: 0 }
        ratingMap[r.rated_id].total += r.stars
        ratingMap[r.rated_id].count += 1
      })
      const hostRatingMap = {}
      Object.entries(ratingMap).forEach(([id, { total, count }]) => {
        hostRatingMap[id] = { avg: Math.round((total / count) * 10) / 10, count }
      })

      // Embed rating into each game's profiles object
      data.forEach(g => {
        if (g.profiles && hostRatingMap[g.host_id]) {
          g.profiles.rating = hostRatingMap[g.host_id]
        }
      })
    }

    setGames(data || [])
    setLoading(false)
  }

  const handleRequest = async (game) => {
    const { data: existing } = await supabase
      .from('round_requests')
      .select('id, status')
      .eq('listing_id', game.id)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (existing) {
      setRequestStatus(s => ({ ...s, [game.id]: existing.status }))
      return
    }

    const { error } = await supabase.from('round_requests').insert({
      listing_id: game.id,
      requester_id: user.id,
      status: 'pending',
    })
    if (!error) setRequestStatus(s => ({ ...s, [game.id]: 'pending' }))
  }

  const handleCancelRequest = async (game) => {
    const { error } = await supabase
      .from('round_requests')
      .delete()
      .eq('listing_id', game.id)
      .eq('requester_id', user.id)
    if (!error) {
      setRequestStatus(s => {
        const next = { ...s }
        delete next[game.id]
        return next
      })
    }
  }

  const handleWithdraw = async () => {
    const game = confirmWithdraw
    setConfirmWithdraw(null)
    await supabase.from('round_requests').delete()
      .eq('listing_id', game.id).eq('requester_id', user.id)
    await supabase.from('round_listings')
      .update({ spots_filled: Math.max(0, game.spots_filled - 1) })
      .eq('id', game.id)
    const firstName = userProfile?.name?.split(' ')[0] || 'A player'
    await supabase.from('round_messages').insert({
      listing_id: game.id,
      user_id: user.id,
      content: `📢 ${firstName} has withdrawn — a spot is now open.`,
    })
    setRequestStatus(s => { const next = { ...s }; delete next[game.id]; return next })
    fetchGames()
  }

  const handleInvite = (player) => {
    setSelectedPlayer(null)
    // Future: open a game invite modal
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        {/* Golf flag decoration */}
        <svg className="absolute right-4 top-6 opacity-10" width="72" height="72" viewBox="0 0 72 72" fill="none">
          <line x1="24" y1="8" x2="24" y2="64" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M24 8 L58 20 L24 32 Z" fill="white"/>
          <ellipse cx="24" cy="64" rx="14" ry="4" fill="white"/>
        </svg>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">SwingSwipe</p>
        <h1 className="text-white text-2xl font-black mb-0.5">Find your round ⛳</h1>
        <p className="text-white/70 text-xs mb-3">Browse players and open games near you</p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('players')}
            className={`pill flex-1 py-1.5 font-bold ${mode === 'players' ? 'bg-white text-[#1D9E75]' : 'bg-white/20 text-white'}`}
          >
            👤 Find a Player
          </button>
          <button
            onClick={() => setMode('games')}
            className={`pill flex-1 py-1.5 font-bold ${mode === 'games' ? 'bg-white text-[#1D9E75]' : 'bg-white/20 text-white'}`}
          >
            ⛳ Find a Game
          </button>
        </div>
      </div>

      {/* Filters for players */}
      {mode === 'players' && (
        <div className="bg-[#1D9E75]/5 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-[#1D9E75]/10">
          {['all', '90s', '80s', '70s', 'scratch', 'beginner'].map(h => (
            <button
              key={h}
              onClick={() => setFilters(f => ({ ...f, handicap: h }))}
              className={`pill whitespace-nowrap text-xs py-1 ${filters.handicap === h ? 'pill-active' : 'pill-inactive'}`}
            >
              {h === 'all' ? 'All levels' : HANDICAP_LABELS[h]}
            </button>
          ))}
        </div>
      )}

      {/* Filters for games */}
      {mode === 'games' && (
        <div className="bg-[#1D9E75]/5 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-[#1D9E75]/10">
          {[['all', 'Any holes'], ['9', '9 holes'], ['18', '18 holes']].map(([val, label]) => (
            <button key={val} onClick={() => setFilters(f => ({ ...f, holes: val }))}
              className={`pill whitespace-nowrap text-xs py-1 ${filters.holes === val ? 'pill-active' : 'pill-inactive'}`}>
              {label}
            </button>
          ))}
          <div className="w-px bg-gray-200 shrink-0 self-stretch my-0.5" />
          {[['all', 'Any pace'], ['quick', '⚡ Quick'], ['normal', '⏱ Normal'], ['relaxed', '☕ Relaxed']].map(([val, label]) => (
            <button key={val} onClick={() => setFilters(f => ({ ...f, gamePace: val }))}
              className={`pill whitespace-nowrap text-xs py-1 ${filters.gamePace === val ? 'pill-active' : 'pill-inactive'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mode === 'players' ? (
          players.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-5xl mb-3">🏌️</p>
              <p className="font-bold text-gray-700 text-lg">No golfers yet</p>
              <p className="text-sm text-gray-400 mt-2">SwingSwipe is just getting started — invite your golf crew and be one of the first.</p>
            </div>
          ) : (
            <>
              <p className="section-label mb-3">{players.length} golfers</p>
              {players.map(p => (
                <PlayerCard key={p.id} player={p} onTap={setSelectedPlayer} />
              ))}
            </>
          )
        ) : (
          games.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-5xl mb-3">⛳</p>
              <p className="font-bold text-gray-700 text-lg">No open games</p>
              <p className="text-sm text-gray-400 mt-2">Be the first — post your tee time in the Games tab.</p>
            </div>
          ) : (
            <>
              <p className="section-label mb-3">{games.length} open game{games.length !== 1 ? 's' : ''}</p>
              {games.map(g => (
                <GameCard
                  key={g.id}
                  game={g}
                  currentUserId={user.id}
                  userHandicap={userProfile?.handicap_range}
                  onRequest={handleRequest}
                  onCancel={handleCancelRequest}
                  onWithdraw={g => setConfirmWithdraw(g)}
                  onHostTap={id => setViewingProfile(id)}
                  requestStatus={requestStatus}
                  acceptedPlayers={gamePlayers[g.id]}
                />
              ))}
            </>
          )
        )}
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          currentUserId={user.id}
          onClose={() => setSelectedPlayer(null)}
          onMessage={handleInvite}
        />
      )}
      {viewingProfile && (
        <PublicProfileModal
          userId={viewingProfile}
          currentUserId={user.id}
          onClose={() => setViewingProfile(null)}
        />
      )}
      {confirmWithdraw && (
        <ConfirmSheet
          title="Withdraw from this game?"
          message="The group will be notified that a spot is open again."
          confirmLabel="Yes, withdraw"
          onConfirm={handleWithdraw}
          onCancel={() => setConfirmWithdraw(null)}
        />
      )}
    </div>
  )
}
