import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'

const PAR = 72

function scoreLabel(score) {
  const diff = score - PAR
  if (diff <= -2) return { label: 'Eagle 🦅', cls: 'score-eagle' }
  if (diff === -1) return { label: 'Birdie 🐦', cls: 'score-birdie' }
  if (diff === 0)  return { label: 'Par ⛳', cls: 'score-par' }
  if (diff <= 5)   return { label: `+${diff}`, cls: 'score-bogey' }
  return { label: `+${diff}`, cls: 'score-double' }
}

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const mins = Math.floor((now - d) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

const REACTIONS = ['🔥', '👏', '😤', '🤣', '🏆']

function FeedCard({ round, currentUserId, friendMap }) {
  const [reactions, setReactions] = useState(round.reactions || {})
  const [myReaction, setMyReaction] = useState(round.my_reaction || null)
  const [showReactions, setShowReactions] = useState(false)

  const profile = round.profiles
  const { label, cls } = scoreLabel(round.score)

  const react = async (emoji) => {
    const newReaction = myReaction === emoji ? null : emoji
    setMyReaction(newReaction)

    const updated = { ...reactions }
    if (myReaction) {
      updated[myReaction] = Math.max(0, (updated[myReaction] || 1) - 1)
      if (updated[myReaction] === 0) delete updated[myReaction]
    }
    if (newReaction) {
      updated[newReaction] = (updated[newReaction] || 0) + 1
    }
    setReactions(updated)
    setShowReactions(false)

    if (myReaction) {
      await supabase.from('round_reactions').delete()
        .eq('round_log_id', round.id).eq('user_id', currentUserId)
    }
    if (newReaction) {
      await supabase.from('round_reactions').upsert({
        round_log_id: round.id, user_id: currentUserId, emoji: newReaction
      })
    }
  }

  return (
    <div className="card feed-card mb-3 overflow-hidden">
      {/* Score color bar */}
      <div className={`h-1.5 w-full pill ${cls}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={profile?.name} url={profile?.avatar_url} size={11} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{profile?.name || 'Golfer'}</p>
              <span className="text-xs text-gray-400">{timeAgo(round.created_at)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {round.course_name}</p>
            {round.profiles?.name && round.playing_with && friendMap[round.playing_with] && (
              <p className="text-xs text-gray-400 mt-0.5">🤝 with {friendMap[round.playing_with]?.name}</p>
            )}
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-center justify-between mt-4 mb-3">
          <div>
            <p className="text-4xl font-black text-[#1a1a1a]">{round.score}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(round.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <span className={`pill text-sm px-4 py-2 ${cls}`}>{label}</span>
        </div>

        {round.notes && (
          <div className="bg-gray-50 rounded-[10px] px-3 py-2 mb-3">
            <p className="text-xs text-gray-600 italic">"{round.notes}"</p>
          </div>
        )}

        {round.wager_type && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs">🤝</span>
            <span className="text-xs text-gray-500">
              {round.wager_type}{round.wager_amount ? ` · ${round.wager_amount} units` : ''}
              {round.wager_result ? ` · ${round.wager_result}` : ''}
            </span>
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(reactions).filter(([, count]) => count > 0).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => react(emoji)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all ${myReaction === emoji ? 'bg-[#1D9E75]/10 border border-[#1D9E75]/30' : 'bg-gray-100'}`}
              >
                <span>{emoji}</span>
                <span className={myReaction === emoji ? 'text-[#1D9E75] font-semibold' : 'text-gray-500'}>{count}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowReactions(r => !r)}
              className="text-lg px-2 py-1 rounded-full active:bg-gray-100 transition-colors"
            >
              {myReaction || '😊'}
            </button>
            {showReactions && (
              <div className="absolute bottom-10 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1 z-10">
                {REACTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => react(e)}
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${myReaction === e ? 'bg-[#1D9E75]/10' : 'hover:bg-gray-50'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Feed({ user }) {
  const [rounds, setRounds] = useState([])
  const [friendMap, setFriendMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [myStreak, setMyStreak] = useState(0)

  useEffect(() => { fetchFeed() }, [])

  const fetchFeed = async () => {
    setLoading(true)

    // Get friends
    const { data: friendRows } = await supabase.from('friends').select('friend_id').eq('user_id', user.id)
    const friendIds = friendRows?.map(f => f.friend_id) || []
    const allIds = [user.id, ...friendIds]

    // Build friend map
    if (friendIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, name, avatar_url').in('id', friendIds)
      const map = {}
      profs?.forEach(p => { map[p.id] = p })
      setFriendMap(map)
    }

    // Get recent rounds for all
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const { data: roundData } = await supabase
      .from('round_logs')
      .select('*, profiles!round_logs_user_id_fkey(id, name, avatar_url)')
      .in('user_id', allIds)
      .gte('date', since.toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(50)

    if (!roundData?.length) { setRounds([]); setLoading(false); return }

    // Fetch reactions
    const roundIds = roundData.map(r => r.id)
    const { data: reactData } = await supabase
      .from('round_reactions')
      .select('round_log_id, user_id, emoji')
      .in('round_log_id', roundIds)

    // Attach reactions to rounds
    const enriched = roundData.map(r => {
      const roundReacts = reactData?.filter(rx => rx.round_log_id === r.id) || []
      const reactionMap = {}
      roundReacts.forEach(rx => { reactionMap[rx.emoji] = (reactionMap[rx.emoji] || 0) + 1 })
      const myReact = roundReacts.find(rx => rx.user_id === user.id)?.emoji || null
      return { ...r, reactions: reactionMap, my_reaction: myReact }
    })

    // Calculate streak (consecutive weeks with a round)
    const myRounds = roundData.filter(r => r.user_id === user.id)
    const weeks = new Set(myRounds.map(r => {
      const d = new Date(r.date)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      return weekStart.toISOString().split('T')[0]
    }))
    setMyStreak(weeks.size)
    setRounds(enriched)
    setLoading(false)
  }

  const myRoundsCount = rounds.filter(r => r.user_id === user.id).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-black">SwingSwipe ⛳</h1>
            <p className="text-white/70 text-xs mt-0.5">Friends' activity</p>
          </div>
          <div className="flex gap-2">
            {myStreak > 0 && (
              <div className="bg-white/20 rounded-[10px] px-3 py-1.5 text-center">
                <p className="text-white font-bold text-sm">{myStreak}🔥</p>
                <p className="text-white/70 text-[10px]">wk streak</p>
              </div>
            )}
            {myRoundsCount > 0 && (
              <div className="bg-white/20 rounded-[10px] px-3 py-1.5 text-center">
                <p className="text-white font-bold text-sm">{myRoundsCount}</p>
                <p className="text-white/70 text-[10px]">rounds</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-5xl mb-3">⛳</p>
            <p className="font-bold text-gray-700 text-lg">No activity yet</p>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Add friends from the Crew tab,<br />then log rounds to see them here.
            </p>
          </div>
        ) : (
          rounds.map(round => (
            <FeedCard
              key={round.id}
              round={round}
              currentUserId={user.id}
              friendMap={friendMap}
            />
          ))
        )}
      </div>
    </div>
  )
}
