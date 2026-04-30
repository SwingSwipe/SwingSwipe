import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'

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

function GameCard({ game, currentUserId, onRequest, requestStatus }) {
  const spotsLeft = game.spots_total - game.spots_filled
  const isOwn = game.host_id === currentUserId
  const status = requestStatus[game.id]

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

        <div className="flex items-center gap-2 mb-3">
          <Avatar name={game.profiles?.name} url={game.profiles?.avatar_url} size={6} />
          <div>
            <p className="text-xs font-medium">{game.profiles?.name?.split(' ')[0]} {game.profiles?.name?.split(' ')[1]?.[0]}.</p>
            <p className="text-xs text-gray-400">Host</p>
          </div>
          {game.vibe && (
            <span className="pill bg-gray-100 text-gray-600 text-xs ml-auto">
              {VIBE_LABELS[game.vibe] || game.vibe}
            </span>
          )}
        </div>

        {game.skill_range && game.skill_range !== 'all_welcome' && (
          <p className="text-xs text-gray-400 mb-3">🎯 {game.skill_range.replace('_', ' ').replace('sub', 'Sub-')} players</p>
        )}

        {game.notes && (
          <p className="text-xs text-gray-500 italic mb-3">"{game.notes}"</p>
        )}

        {!isOwn && spotsLeft > 0 && (
          <button
            onClick={() => onRequest(game)}
            disabled={!!status}
            className={`w-full py-2.5 rounded-[10px] text-sm font-bold transition-all ${
              status === 'pending' ? 'bg-gray-100 text-gray-500' :
              status === 'accepted' ? 'bg-green-100 text-green-700' :
              'bg-[#1D9E75] text-white active:opacity-80'
            }`}
          >
            {status === 'pending' ? '✓ Request sent' :
             status === 'accepted' ? '✓ You\'re in!' :
             'Request to join →'}
          </button>
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-[24px] p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
    </div>
    </Modal>
  )
}

export default function Discover({ user }) {
  const [mode, setMode] = useState('players')
  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [requestStatus, setRequestStatus] = useState({})
  const [filters, setFilters] = useState({ handicap: 'all', pace: 'all' })

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
    const { data } = await supabase
      .from('round_listings')
      .select('*, profiles(name, avatar_url)')
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('tee_time', { ascending: true })

    // Get existing requests
    if (data?.length) {
      const { data: reqs } = await supabase
        .from('round_requests')
        .select('listing_id, status')
        .eq('requester_id', user.id)
        .in('listing_id', data.map(g => g.id))

      const statusMap = {}
      reqs?.forEach(r => { statusMap[r.listing_id] = r.status })
      setRequestStatus(statusMap)
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
    })
    if (!error) setRequestStatus(s => ({ ...s, [game.id]: 'pending' }))
  }

  const handleInvite = (player) => {
    setSelectedPlayer(null)
    // Future: open a game invite modal
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        <h1 className="text-white text-xl font-black mb-3">Discover 🔍</h1>
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

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mode === 'players' ? (
          players.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-5xl mb-3">🏌️</p>
              <p className="font-bold text-gray-700 text-lg">No golfers found</p>
              <p className="text-sm text-gray-400 mt-2">Be the first in your area — invite your golf crew.</p>
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
              <p className="text-sm text-gray-400 mt-2">Post your tee time in the Games tab and find players.</p>
            </div>
          ) : (
            <>
              <p className="section-label mb-3">{games.length} open game{games.length !== 1 ? 's' : ''}</p>
              {games.map(g => (
                <GameCard
                  key={g.id}
                  game={g}
                  currentUserId={user.id}
                  onRequest={handleRequest}
                  requestStatus={requestStatus}
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
    </div>
  )
}
