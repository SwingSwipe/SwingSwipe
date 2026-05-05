import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import ConfirmSheet from '../components/ConfirmSheet'
import PublicProfileModal from '../components/PublicProfileModal'
import { PlayerCardSkeleton, GameCardSkeleton } from '../components/Skeleton'
import { showToast } from '../components/Toast'

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

function FoursomeStrip({ host, players = [], total = 4, filled }) {
  const knownPlayers = [
    ...(host ? [{ ...host, id: host.id || 'host' }] : []),
    ...players,
  ].slice(0, total)
  const occupied = Math.min(total, Math.max(filled || knownPlayers.length, knownPlayers.length))
  const open = Math.max(0, total - occupied)

  return (
    <div className="bg-[#1D9E75]/5 rounded-[12px] px-3 py-2 mb-3 flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex -space-x-1.5">
          {knownPlayers.map((p, idx) => (
            <Avatar key={p.id || `${p.name}-${idx}`} name={p.name} url={p.avatar_url} size={7} />
          ))}
          {Array.from({ length: Math.max(0, occupied - knownPlayers.length) }).map((_, idx) => (
            <div key={`anon-${idx}`} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
              ?
            </div>
          ))}
          {Array.from({ length: open }).map((_, idx) => (
            <div key={`open-${idx}`} className="w-7 h-7 rounded-full bg-white border-2 border-dashed border-[#1D9E75]/35 flex items-center justify-center text-xs font-black text-[#1D9E75]">
              +
            </div>
          ))}
        </div>
        <p className="ml-3 text-xs font-bold text-gray-600">{occupied}/{total} players</p>
      </div>
      <p className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-wide">{open > 0 ? `${open} open` : 'Full'}</p>
    </div>
  )
}

function PlayerCard({ player, onTap }) {
  return (
    <div onClick={() => onTap(player)} className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-4 mb-3 cursor-pointer active:scale-[0.99] active:opacity-90 transition-transform">
      <div className="flex items-start gap-3">
        <Avatar name={player.name} url={player.avatar_url} size={14} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-[15px]">{player.name?.split(' ')[0]} {player.name?.split(' ')[1]?.[0]}.</p>
              <p className="text-xs text-gray-400 mt-0.5">📍 {player.home_course || player.location || 'No home course'}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="pill bg-[#1D9E75]/10 text-[#064e35] text-xs font-bold px-2 py-1">
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
    <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm mb-3 overflow-hidden active:scale-[0.995] transition-transform">
      <div className={`h-1.5 ${spotsLeft > 0 ? 'bg-[#1D9E75]' : 'bg-gray-300'}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 pr-2">
            <p className="font-black text-[15px] text-[#16231d] truncate">{game.course_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
              {game.distance != null && ` · 📍 ${game.distance} mi`}
            </p>
          </div>
          <div className="text-right">
            <span className={`pill text-xs font-bold ${spotsLeft > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left` : 'Full'}
            </span>
          </div>
        </div>

        <FoursomeStrip
          host={game.profiles}
          players={acceptedPlayers || []}
          total={game.spots_total || 4}
          filled={game.spots_filled || 1}
        />

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
          ) : status === 'sending' ? (
            <div className="w-full py-2.5 rounded-[10px] text-sm font-bold bg-gray-100 text-gray-400 text-center">
              Sending request…
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
          ) : status === 'declined' ? (
            <div className="flex gap-2">
              <div className="flex-1 py-2.5 rounded-[10px] text-sm font-bold bg-red-50 text-red-500 text-center">
                Request declined
              </div>
              {spotsLeft > 0 && (
                <button
                  onClick={() => onRequest(game)}
                  className="px-4 py-2.5 rounded-[10px] text-sm font-bold bg-[#1D9E75] text-white active:opacity-80"
                >
                  Request again
                </button>
              )}
            </div>
          ) : spotsLeft > 0 ? (
            <button
              onClick={() => onRequest(game)}
              className="w-full py-3 rounded-[12px] text-sm font-black bg-[#1D9E75] text-white active:scale-[0.99] transition-transform shadow-sm shadow-green-900/10"
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

function DiscoverEmptyState({ mode, onInvite, onPostGame, filtered }) {
  if (mode === 'players') {
    return (
      <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm px-5 py-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#1D9E75]/10 flex items-center justify-center text-3xl mb-4">🏌️</div>
        <p className="font-black text-[#16231d] text-lg">{filtered ? 'No golfers match that yet' : "You're one of the first"}</p>
        <p className="text-sm text-gray-500 mt-2 mb-5">
          {filtered ? 'Try widening the skill filter, or invite a few golfers so the feed wakes up.' : 'Invite your golf crew so the player feed starts feeling alive.'}
        </p>
        <button onClick={onInvite} className="bg-[#1D9E75] text-white font-black px-6 py-3 rounded-[12px] text-sm active:scale-[0.98] transition-transform">
          Invite golfers →
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm px-5 py-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-[#1D9E75]/10 flex items-center justify-center text-3xl mb-4">⛳</div>
      <p className="font-black text-[#16231d] text-lg">{filtered ? 'No games match those filters' : 'No open games yet'}</p>
      <p className="text-sm text-gray-500 mt-2 mb-5">
        {filtered ? 'Try any distance, any holes, or any pace to see more tee times.' : 'Post a tee time and let nearby players request to join.'}
      </p>
      <button onClick={onPostGame} className="bg-[#1D9E75] text-white font-black px-6 py-3 rounded-[12px] text-sm active:scale-[0.98] transition-transform">
        Post a game ⛳
      </button>
    </div>
  )
}

function InviteToGameModal({ host, invitee, onClose }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState({})

  useEffect(() => {
    supabase.from('round_listings')
      .select('*').eq('host_id', host.id).eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .then(({ data }) => { setGames(data || []); setLoading(false) })
  }, [])

  const sendInvite = async (game) => {
    setSent(s => ({ ...s, [game.id]: true }))
    await supabase.from('round_requests').insert({
      listing_id: game.id,
      requester_id: invitee.id,
      invited_by: host.id,
      status: 'invited',
    })
  }

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/60 z-[70]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[24px] p-6 max-h-[80vh] overflow-y-auto">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
      <h3 className="font-black text-lg mb-1">Invite {invitee.name?.split(' ')[0]}</h3>
      <p className="text-sm text-gray-400 mb-4">Pick one of your open games</p>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No open games — post one in the Games tab first.</p>
      ) : (
        games.map(game => (
          <div key={game.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="font-semibold text-sm">{game.course_name}</p>
              <p className="text-xs text-gray-400">
                {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {game.tee_time && ` · ${game.tee_time.slice(0, 5)}`}
              </p>
            </div>
            <button
              onClick={() => sendInvite(game)}
              disabled={sent[game.id]}
              className={`px-4 py-1.5 rounded-[8px] text-sm font-bold transition-all ${sent[game.id] ? 'bg-green-100 text-green-700' : 'bg-[#1D9E75] text-white active:opacity-80'}`}
            >
              {sent[game.id] ? '✓ Sent' : 'Invite'}
            </button>
          </div>
        ))
      )}
      <button onClick={onClose} className="w-full text-center text-sm text-gray-400 mt-4">Done</button>
    </div>
    </>
    </Modal>
  )
}

function PlayerModal({ player, currentUserId, onClose, onInvite }) {
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
          <button onClick={() => onInvite(player)} className="btn-primary">
            Invite to a game ⛳
          </button>
        )}
      </div>
    </>
    </Modal>
  )
}

export default function Discover({ user, userProfile, onNavigateTab }) {
  const [mode, setMode] = useState('players')
  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [requestStatus, setRequestStatus] = useState({})
  const [gamePlayers, setGamePlayers] = useState({})
  const [filters, setFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem('discover_filters')) || { handicap: 'all', pace: 'all', holes: 'all', gamePace: 'all', distance: 'all' } }
    catch { return { handicap: 'all', pace: 'all', holes: 'all', gamePace: 'all', distance: 'all' } }
  })
  const [confirmWithdraw, setConfirmWithdraw] = useState(null)
  const [invitePlayer, setInvitePlayer] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const hasPlayerFilters = filters.handicap !== 'all' || filters.pace !== 'all'
  const hasGameFilters = filters.holes !== 'all' || filters.gamePace !== 'all' || filters.distance !== 'all'

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    const scrollEl = e.currentTarget
    const pulled = e.changedTouches[0].clientY - touchStartY.current
    if (pulled > 60 && scrollEl.scrollTop === 0) {
      setRefreshing(true)
      const fn = mode === 'players' ? fetchPlayers : fetchGames
      fn().finally(() => setRefreshing(false))
    }
  }

  const updateFilters = (fn) => setFilters(f => {
    const next = fn(f)
    localStorage.setItem('discover_filters', JSON.stringify(next))
    return next
  })

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  useEffect(() => {
    if (mode === 'players') fetchPlayers()
    else fetchGames()
  }, [mode, filters, userLocation])

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

  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 3958.8
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

    const { data: rawData } = await query

    let data = rawData || []

    if (filters.distance !== 'all' && userLocation) {
      const miles = parseInt(filters.distance)
      data = data.filter(g => {
        if (!g.lat || !g.lng) return true
        return haversine(userLocation.lat, userLocation.lng, g.lat, g.lng) <= miles
      })
    }

    if (userLocation) {
      data = data.map(g => ({
        ...g,
        distance: g.lat && g.lng ? Math.round(haversine(userLocation.lat, userLocation.lng, g.lat, g.lng)) : null,
      }))
    }

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
    setRequestStatus(s => ({ ...s, [game.id]: 'sending' }))
    const { data: existing, error: existingError } = await supabase
      .from('round_requests')
      .select('id, status')
      .eq('listing_id', game.id)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'declined') {
        const { error } = await supabase
          .from('round_requests')
          .update({ status: 'pending' })
          .eq('id', existing.id)

        if (error) {
          setRequestStatus(s => ({ ...s, [game.id]: 'declined' }))
          showToast(`Could not request again: ${error.message}`)
          return
        }

        setRequestStatus(s => ({ ...s, [game.id]: 'pending' }))
        notifyHost(game)
        showToast('Request sent again.', 'success')
        return
      }
      setRequestStatus(s => ({ ...s, [game.id]: existing.status }))
      return
    }
    if (existingError) {
      setRequestStatus(s => {
        const next = { ...s }
        delete next[game.id]
        return next
      })
      showToast(`Could not check request: ${existingError.message}`)
      return
    }

    const { error } = await supabase.from('round_requests').insert({
      listing_id: game.id,
      requester_id: user.id,
      status: 'pending',
    })
    if (!error) {
      setRequestStatus(s => ({ ...s, [game.id]: 'pending' }))
      notifyHost(game)
    } else if (error.code === '23505') {
      const { data: duplicate } = await supabase
        .from('round_requests')
        .select('status')
        .eq('listing_id', game.id)
        .eq('requester_id', user.id)
        .maybeSingle()
      setRequestStatus(s => ({ ...s, [game.id]: duplicate?.status || 'pending' }))
      showToast('You already requested this game.', 'success')
    } else {
      setRequestStatus(s => {
        const next = { ...s }
        delete next[game.id]
        return next
      })
      showToast(`Request failed: ${error.message}`)
    }
  }

  const notifyHost = (game) => {
    const requesterName = userProfile?.name?.split(' ')[0] || 'Someone'
    const date = new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    supabase.functions.invoke('send-push', {
      body: {
        user_id: game.host_id,
        title: `${requesterName} wants to join your game ⛳`,
        body: `${game.course_name} · ${date}${game.tee_time ? ` · ${game.tee_time.slice(0, 5)}` : ''}`,
      },
    })
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
    // Optimistically update UI immediately
    setRequestStatus(s => { const next = { ...s }; delete next[game.id]; return next })
    // Post chat message first while still an accepted player (RLS may block after deletion)
    const firstName = userProfile?.name?.split(' ')[0] || 'A player'
    await supabase.from('round_messages').insert({
      listing_id: game.id,
      user_id: user.id,
      content: `📢 ${firstName} has withdrawn — a spot is now open.`,
    })
    await supabase.from('round_requests').delete()
      .eq('listing_id', game.id).eq('requester_id', user.id)
    const newFilled = Math.max(0, game.spots_filled - 1)
    await supabase.from('round_listings')
      .update({ spots_filled: newFilled, is_active: newFilled < game.spots_total })
      .eq('id', game.id)
    // Notify host that a spot opened up
    const date = new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    supabase.functions.invoke('send-push', {
      body: {
        user_id: game.host_id,
        title: `${firstName} withdrew — spot is open ⛳`,
        body: `${game.course_name} · ${date} now has an open spot.`,
      },
    })
    fetchGames()
  }

  const handleInvite = (player) => {
    setSelectedPlayer(null)
    setInvitePlayer(player)
  }

  const shareInvite = () => {
    const text = `Play golf with me on SwingSwipe ⛳\nFind games, join rounds, and track scores.\n${window.location.origin}`
    if (navigator.share) navigator.share({ title: 'SwingSwipe', text })
    else navigator.clipboard?.writeText(window.location.origin)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header pb-5">
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
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Feed</p>
            <p className="text-sm font-black text-white">{mode === 'players' ? `${players.length || 0} golfers` : `${games.length || 0} games`}</p>
          </div>
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Skill</p>
            <p className="text-sm font-black text-white truncate">{HANDICAP_LABELS[userProfile?.handicap_range] || 'Open'}</p>
          </div>
          <div className="bg-white/12 rounded-[12px] px-3 py-2">
            <p className="text-[10px] uppercase font-black text-white/50">Area</p>
            <p className="text-sm font-black text-white truncate">{userLocation ? 'Nearby' : 'Any'}</p>
          </div>
        </div>
      </div>

      {/* Filters for players */}
      {mode === 'players' && (
        <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 shadow-sm">
          {['all', '90s', '80s', '70s', 'scratch', 'beginner'].map(h => (
            <button
              key={h}
              onClick={() => updateFilters(f => ({ ...f, handicap: h }))}
              className={`pill whitespace-nowrap text-xs py-1 ${filters.handicap === h ? 'pill-active' : 'pill-inactive'}`}
            >
              {h === 'all' ? 'All levels' : HANDICAP_LABELS[h]}
            </button>
          ))}
        </div>
      )}

      {/* Filters for games */}
      {mode === 'games' && (
        <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 shadow-sm">
          {userLocation && <>
            {[['all', '📍 Any dist.'], ['10', '10 mi'], ['25', '25 mi'], ['50', '50 mi']].map(([val, label]) => (
              <button key={val} onClick={() => updateFilters(f => ({ ...f, distance: val }))}
                className={`pill whitespace-nowrap text-xs py-1 ${filters.distance === val ? 'pill-active' : 'pill-inactive'}`}>
                {label}
              </button>
            ))}
            <div className="w-px bg-gray-200 shrink-0 self-stretch my-0.5" />
          </>}
          {[['all', 'Any holes'], ['9', '9 holes'], ['18', '18 holes']].map(([val, label]) => (
            <button key={val} onClick={() => updateFilters(f => ({ ...f, holes: val }))}
              className={`pill whitespace-nowrap text-xs py-1 ${filters.holes === val ? 'pill-active' : 'pill-inactive'}`}>
              {label}
            </button>
          ))}
          <div className="w-px bg-gray-200 shrink-0 self-stretch my-0.5" />
          {[['all', 'Any pace'], ['quick', '⚡ Quick'], ['normal', '⏱ Normal'], ['relaxed', '☕ Relaxed']].map(([val, label]) => (
            <button key={val} onClick={() => updateFilters(f => ({ ...f, gamePace: val }))}
              className={`pill whitespace-nowrap text-xs py-1 ${filters.gamePace === val ? 'pill-active' : 'pill-inactive'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {refreshing && (
          <div className="flex justify-center mb-2">
            <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) =>
              mode === 'players' ? <PlayerCardSkeleton key={i} /> : <GameCardSkeleton key={i} />
            )}
          </>
        ) : mode === 'players' ? (
          players.length === 0 ? (
            <DiscoverEmptyState mode="players" filtered={hasPlayerFilters} onInvite={shareInvite} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">{players.length} golfers</p>
                {hasPlayerFilters && (
                  <button onClick={() => updateFilters(f => ({ ...f, handicap: 'all', pace: 'all' }))} className="text-xs font-black text-[#1D9E75]">
                    Clear filters
                  </button>
                )}
              </div>
              {players.map(p => (
                <PlayerCard key={p.id} player={p} onTap={setSelectedPlayer} />
              ))}
            </>
          )
        ) : (
          games.length === 0 ? (
            <DiscoverEmptyState mode="games" filtered={hasGameFilters} onPostGame={() => onNavigateTab?.('games')} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">{games.length} open game{games.length !== 1 ? 's' : ''}</p>
                {hasGameFilters && (
                  <button onClick={() => updateFilters(f => ({ ...f, holes: 'all', gamePace: 'all', distance: 'all' }))} className="text-xs font-black text-[#1D9E75]">
                    Clear filters
                  </button>
                )}
              </div>
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
          onInvite={handleInvite}
        />
      )}
      {invitePlayer && (
        <InviteToGameModal
          host={user}
          invitee={invitePlayer}
          onClose={() => setInvitePlayer(null)}
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
