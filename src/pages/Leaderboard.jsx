import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'

function calculateHandicapAdjusted(score, handicap) {
  const par = 72
  const handicapNum = handicap ? parseFloat(handicap) : 18
  return score - handicapNum
}

function getTrendEmoji(scores) {
  if (scores.length < 2) return ''
  const recent = scores[scores.length - 1]
  const prev = scores[scores.length - 2]
  return recent < prev ? '📉' : recent > prev ? '📈' : '➡️'
}

export default function Leaderboard({ user, profile }) {
  const [crews, setCrews] = useState([])
  const [activeCrew, setActiveCrew] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateCrew, setShowCreateCrew] = useState(false)
  const [crewName, setCrewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('weekly')

  useEffect(() => { fetchCrews() }, [])
  useEffect(() => { if (activeCrew) fetchLeaderboard(activeCrew) }, [activeCrew, activeTab])

  const fetchCrews = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('crew_members')
      .select('crew_id, crews(id, name, created_by)')
      .eq('user_id', user.id)

    const crewList = data?.map(r => r.crews).filter(Boolean) || []
    setCrews(crewList)
    if (crewList.length > 0) setActiveCrew(crewList[0])
    setLoading(false)
  }

  const fetchLeaderboard = async (crew) => {
    setLoading(true)
    const { data: members } = await supabase
      .from('crew_members')
      .select('user_id, profiles(id, name, avatar_url, handicap_range, avg_score)')
      .eq('crew_id', crew.id)

    if (!members?.length) { setLeaderboard([]); setLoading(false); return }

    const memberIds = members.map(m => m.user_id)
    const profiles = members.map(m => m.profiles).filter(Boolean)

    const now = new Date()
    let dateFilter
    if (activeTab === 'weekly') {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      dateFilter = weekStart.toISOString().split('T')[0]
    } else {
      dateFilter = `${now.getFullYear()}-01-01`
    }

    const { data: rounds } = await supabase
      .from('round_logs')
      .select('user_id, score, date, course_name')
      .in('user_id', memberIds)
      .gte('date', dateFilter)
      .order('date', { ascending: true })

    const board = profiles.map(p => {
      const userRounds = rounds?.filter(r => r.user_id === p.id) || []
      const handicap = p.handicap_range === 'scratch' ? 0
        : p.handicap_range === '70s' ? 5
        : p.handicap_range === '80s' ? 15
        : p.handicap_range === '90s' ? 25
        : p.handicap_range === 'beginner' ? 36
        : p.avg_score ? p.avg_score - 72 : 18

      const adjustedScores = userRounds.map(r => calculateHandicapAdjusted(r.score, handicap))
      const bestAdjusted = adjustedScores.length ? Math.min(...adjustedScores) : null
      const avgAdjusted = adjustedScores.length
        ? Math.round(adjustedScores.reduce((a, b) => a + b, 0) / adjustedScores.length * 10) / 10
        : null

      return {
        ...p,
        rounds: userRounds,
        roundCount: userRounds.length,
        bestAdjusted,
        avgAdjusted,
        trend: getTrendEmoji(adjustedScores),
        rawScores: userRounds.map(r => r.score),
      }
    })

    board.sort((a, b) => {
      if (a.avgAdjusted === null && b.avgAdjusted === null) return 0
      if (a.avgAdjusted === null) return 1
      if (b.avgAdjusted === null) return -1
      return a.avgAdjusted - b.avgAdjusted
    })

    setLeaderboard(board)
    setLoading(false)
  }

  const createCrew = async () => {
    if (!crewName.trim()) return
    setCreating(true)
    const { data: crew, error } = await supabase
      .from('crews')
      .insert({ name: crewName.trim(), created_by: user.id })
      .select()
      .single()

    if (!error && crew) {
      await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: user.id })
      setCrewName('')
      setShowCreateCrew(false)
      fetchCrews()
    }
    setCreating(false)
  }

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-black">Standings 🏆</h1>
          <button
            onClick={() => setShowCreateCrew(true)}
            className="text-sm bg-white text-[#1D9E75] px-3 py-1.5 rounded-[10px] font-bold shadow-sm"
          >
            + New crew
          </button>
        </div>

        {/* Crew selector */}
        {crews.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2">
            {crews.map(crew => (
              <button
                key={crew.id}
                onClick={() => setActiveCrew(crew)}
                className={`pill whitespace-nowrap py-1.5 ${activeCrew?.id === crew.id ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}
              >
                {crew.name}
              </button>
            ))}
          </div>
        )}

        {/* Weekly / Season toggle */}
        {activeCrew && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`pill flex-1 py-1.5 ${activeTab === 'weekly' ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}
            >
              This week
            </button>
            <button
              onClick={() => setActiveTab('season')}
              className={`pill flex-1 py-1.5 ${activeTab === 'season' ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}
            >
              Season
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : crews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold text-gray-700">No crews yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Create a crew with your golf buddies to start competing.</p>
            <button onClick={() => setShowCreateCrew(true)} className="btn-primary max-w-[200px]">
              Create your crew
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">⛳</p>
            <p className="font-semibold text-gray-700">No rounds logged yet</p>
            <p className="text-sm text-gray-400 mt-1">Log a round to appear on the leaderboard.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 text-center">Handicap-adjusted scores · lower is better</p>
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`card p-4 flex items-center gap-3 ${player.id === user.id ? 'border-[#1D9E75] border' : ''}`}
                >
                  <div className="w-8 text-center font-bold text-lg">
                    {getMedalEmoji(index)}
                  </div>
                  <Avatar name={player.name} url={player.avatar_url} size={10} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{player.name}</p>
                      {player.id === user.id && (
                        <span className="text-xs text-[#1D9E75] font-medium">(you)</span>
                      )}
                      <span className="text-sm">{player.trend}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {player.roundCount} round{player.roundCount !== 1 ? 's' : ''} · raw avg {player.rawScores.length ? Math.round(player.rawScores.reduce((a,b)=>a+b,0)/player.rawScores.length) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    {player.avgAdjusted !== null ? (
                      <>
                        <p className="text-xl font-bold text-[#1D9E75]">
                          {player.avgAdjusted > 0 ? '+' : ''}{player.avgAdjusted}
                        </p>
                        <p className="text-xs text-gray-400">adj. avg</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-300">No rounds</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-300 text-center mt-4">
              Scores are adjusted based on handicap range for fair competition
            </p>
          </>
        )}
      </div>

      {/* Create crew modal */}
      {showCreateCrew && (
        <Modal>
        <>
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowCreateCrew(false)} />
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[20px] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Create a Crew</h2>
              <button onClick={() => setShowCreateCrew(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <input
              className="input-field mb-4"
              placeholder="Crew name (e.g. Saturday Morning Boys)"
              value={crewName}
              onChange={e => setCrewName(e.target.value)}
            />
            <p className="text-xs text-gray-400 mb-4">After creating, share the crew name with your friends so they can join from their Friends tab.</p>
            <button onClick={createCrew} className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Crew'}
            </button>
          </div>
        </>
        </Modal>
      )}
    </div>
  )
}
