import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import ProfileCard from '../components/ProfileCard'

async function getAIMatchScore(user1, user2) {
  const cacheKey = [user1.id, user2.id].sort().join('-')
  const { data: cached } = await supabase
    .from('matches')
    .select('match_score, match_reason')
    .or(`and(user_1_id.eq.${user1.id},user_2_id.eq.${user2.id}),and(user_1_id.eq.${user2.id},user_2_id.eq.${user1.id})`)
    .not('match_score', 'is', null)
    .maybeSingle()

  if (cached) return { score: cached.match_score, reason: cached.match_reason }

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_claude_api_key') return { score: null, reason: null }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are a golf playing partner matching system.
Given two golfer profiles, return a JSON object with:
- match_score: number 0-100
- reason: one short sentence explaining the match

Profile 1: ${JSON.stringify({ name: user1.name, handicap_range: user1.handicap_range, avg_score: user1.avg_score, availability: user1.availability, pace: user1.pace, cart_or_walk: user1.cart_or_walk, vibe_tags: user1.vibe_tags })}
Profile 2: ${JSON.stringify({ name: user2.name, handicap_range: user2.handicap_range, avg_score: user2.avg_score, availability: user2.availability, pace: user2.pace, cart_or_walk: user2.cart_or_walk, vibe_tags: user2.vibe_tags })}

Return only valid JSON, no other text.`,
        }],
      }),
    })
    const json = await res.json()
    const text = json.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text)
    return { score: parsed.match_score, reason: parsed.reason }
  } catch {
    return { score: null, reason: null }
  }
}

export default function Match({ user, profile }) {
  const [candidates, setCandidates] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchScores, setMatchScores] = useState({})
  const [matchModal, setMatchModal] = useState(null)
  const [dragOffset, setDragOffset] = useState(0)
  const startX = useRef(null)

  useEffect(() => { fetchCandidates() }, [])

  const fetchCandidates = async () => {
    setLoading(true)

    const { data: swipedRows } = await supabase
      .from('matches')
      .select('user_2_id')
      .eq('user_1_id', user.id)

    const swipedIds = [user.id, ...(swipedRows?.map(r => r.user_2_id) || [])]

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${swipedIds.join(',')})`)
      .not('name', 'is', null)
      .limit(20)

    setCandidates(data || [])
    setCurrentIdx(0)
    setLoading(false)

    if (data?.length && profile) {
      for (const candidate of data.slice(0, 3)) {
        getAIMatchScore(profile, candidate).then(result => {
          setMatchScores(prev => ({ ...prev, [candidate.id]: result }))
        })
      }
    }
  }

  const swipe = async (direction) => {
    const candidate = candidates[currentIdx]
    if (!candidate) return

    const isRight = direction === 'right'

    await supabase.from('matches').upsert({
      user_1_id: user.id,
      user_2_id: candidate.id,
      user_1_swiped: direction,
    }, { onConflict: 'user_1_id,user_2_id' })

    const { data: theirSwipe } = await supabase
      .from('matches')
      .select('user_1_swiped')
      .eq('user_1_id', candidate.id)
      .eq('user_2_id', user.id)
      .maybeSingle()

    if (isRight && theirSwipe?.user_1_swiped === 'right') {
      await supabase.from('matches').update({ is_match: true })
        .or(`and(user_1_id.eq.${user.id},user_2_id.eq.${candidate.id}),and(user_1_id.eq.${candidate.id},user_2_id.eq.${user.id})`)

      await supabase.from('friends').upsert([
        { user_id: user.id, friend_id: candidate.id },
        { user_id: candidate.id, friend_id: user.id },
      ], { onConflict: 'user_id,friend_id' })

      setMatchModal(candidate)
      return
    }

    setDragOffset(0)
    setCurrentIdx(i => i + 1)

    const next = candidates[currentIdx + 3]
    if (next && profile) {
      getAIMatchScore(profile, next).then(result => {
        setMatchScores(prev => ({ ...prev, [next.id]: result }))
      })
    }
  }

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const handleTouchMove = (e) => {
    if (startX.current == null) return
    setDragOffset(e.touches[0].clientX - startX.current)
  }
  const handleTouchEnd = () => {
    if (Math.abs(dragOffset) > 80) {
      swipe(dragOffset > 0 ? 'right' : 'left')
    } else {
      setDragOffset(0)
    }
    startX.current = null
  }

  const currentProfile = candidates[currentIdx]
  const scoreData = currentProfile ? matchScores[currentProfile.id] : null

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">Match</h1>
        {candidates.length > 0 && currentIdx < candidates.length && (
          <p className="text-sm text-gray-400 mt-0.5">
            {candidates.length - currentIdx} golfer{candidates.length - currentIdx !== 1 ? 's' : ''} near you
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
        {loading ? (
          <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        ) : !currentProfile ? (
          <div className="text-center">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="font-semibold text-gray-700">You've seen everyone nearby</p>
            <p className="text-sm text-gray-400 mt-1">Check back later for new golfers.</p>
            <button onClick={fetchCandidates} className="mt-4 btn-primary max-w-[200px]">Refresh</button>
          </div>
        ) : (
          <ProfileCard
            profile={currentProfile}
            matchScore={scoreData?.score}
            matchReason={scoreData?.reason}
            onPass={() => swipe('left')}
            onLike={() => swipe('right')}
            style={{
              transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
              transition: dragOffset === 0 ? 'transform 0.3s ease' : 'none',
            }}
            dragHandlers={{
              onTouchStart: handleTouchStart,
              onTouchMove: handleTouchMove,
              onTouchEnd: handleTouchEnd,
            }}
          />
        )}
      </div>

      {matchModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[20px] p-6 text-center w-full max-w-sm">
            <p className="text-4xl mb-2">🎉</p>
            <h2 className="text-xl font-bold mb-1">It's a match!</h2>
            <p className="text-gray-500 text-sm mb-5">
              You and {matchModal.name} both want to play together.
            </p>
            <button
              onClick={() => { setMatchModal(null); setCurrentIdx(i => i + 1) }}
              className="btn-primary mb-3"
            >
              Keep swiping
            </button>
            <button
              onClick={() => setMatchModal(null)}
              className="text-sm text-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
