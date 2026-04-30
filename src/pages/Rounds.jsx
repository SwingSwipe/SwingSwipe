import Modal from '../components/Modal'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CURRENT_SEASON = new Date().getFullYear()

function LogRoundModal({ userId, friends, onClose, onLogged }) {
  const [form, setForm] = useState({
    course_name: '', date: '', score: '', playing_with: '', notes: '',
    wager_type: '', wager_amount: '', wager_opponent: '', wager_result: '',
  })
  const [saving, setSaving] = useState(false)
  const [showWager, setShowWager] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.course_name || !form.date || !form.score) return
    setSaving(true)
    const { error } = await supabase.from('round_logs').insert({
      user_id: userId,
      course_name: form.course_name,
      date: form.date,
      score: parseInt(form.score),
      playing_with: form.playing_with || null,
      notes: form.notes || null,
      wager_type: showWager ? (form.wager_type || null) : null,
      wager_amount: showWager && form.wager_amount ? parseFloat(form.wager_amount) : null,
      wager_opponent: showWager ? (form.wager_opponent || null) : null,
      wager_result: showWager ? (form.wager_result || null) : null,
    })

    if (!error) {
      const { data: allRounds } = await supabase
        .from('round_logs').select('score').eq('user_id', userId).gte('date', `${CURRENT_SEASON}-01-01`)
      if (allRounds?.length) {
        const avg = allRounds.reduce((s, r) => s + r.score, 0) / allRounds.length
        await supabase.from('profiles').update({ avg_score: Math.round(avg * 10) / 10 }).eq('id', userId)
      }
      onLogged()
      onClose()
    }
    setSaving(false)
  }

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[20px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Log Round</h2>
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
              <label className="text-xs text-gray-500 mb-1 block">Score</label>
              <input className="input-field" type="number" placeholder="88" value={form.score} onChange={e => set('score', e.target.value)} />
            </div>
          </div>

          {friends.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Played with</label>
              <select className="input-field" value={form.playing_with} onChange={e => set('playing_with', e.target.value)}>
                <option value="">Solo / other</option>
                {friends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <textarea className="input-field resize-none" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />

          {/* Wager toggle */}
          <button
            type="button"
            onClick={() => setShowWager(w => !w)}
            className="w-full flex items-center justify-between px-4 py-3 border border-dashed border-gray-300 rounded-[10px] text-sm text-gray-500"
          >
            <span>{showWager ? 'Hide friendly bet' : '+ Add friendly bet'}</span>
            <span className="text-lg">{showWager ? '−' : '🤝'}</span>
          </button>

          {showWager && (
            <div className="bg-gray-50 rounded-[12px] p-4 space-y-3">
              <p className="text-xs text-gray-400 text-center">For entertainment purposes only · No real money involved</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bet type</label>
                  <select className="input-field" value={form.wager_type} onChange={e => set('wager_type', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="Nassau">Nassau</option>
                    <option value="Skins">Skins</option>
                    <option value="Match play">Match play</option>
                    <option value="Stroke play">Stroke play</option>
                    <option value="Wolf">Wolf</option>
                    <option value="Birdies">Birdies</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stakes (units)</label>
                  <input className="input-field" type="number" placeholder="e.g. 5" value={form.wager_amount} onChange={e => set('wager_amount', e.target.value)} />
                </div>
              </div>
              {friends.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Against</label>
                  <select className="input-field" value={form.wager_opponent} onChange={e => set('wager_opponent', e.target.value)}>
                    <option value="">Select opponent</option>
                    {friends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Result</label>
                <div className="flex gap-2">
                  {['Won', 'Lost', 'Tied'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set('wager_result', r)}
                      className={`flex-1 py-2 rounded-[8px] text-sm font-semibold border ${form.wager_result === r ? 'bg-[#1D9E75] text-white border-[#1D9E75]' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button onClick={submit} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log Round'}
          </button>
        </div>
      </div>
    </>
    </Modal>
  )
}

function WagerBadge({ result }) {
  if (!result) return null
  const colors = { Won: 'bg-green-100 text-green-700', Lost: 'bg-red-100 text-red-700', Tied: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[result] || colors.Tied}`}>{result}</span>
  )
}

export default function Rounds({ user }) {
  const [rounds, setRounds] = useState([])
  const [friends, setFriends] = useState([])
  const [friendMap, setFriendMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [activeTab, setActiveTab] = useState('rounds')

  const fetchRounds = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('round_logs')
      .select('*, profiles!round_logs_playing_with_fkey(name)')
      .eq('user_id', user.id)
      .gte('date', `${CURRENT_SEASON}-01-01`)
      .order('date', { ascending: false })
    setRounds(data || [])
    setLoading(false)
  }

  const fetchFriends = async () => {
    const { data: rows } = await supabase.from('friends').select('friend_id').eq('user_id', user.id)
    if (!rows?.length) return
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', rows.map(r => r.friend_id))
    setFriends(profiles || [])
    const map = {}
    profiles?.forEach(p => { map[p.id] = p })
    setFriendMap(map)
  }

  useEffect(() => { fetchRounds(); fetchFriends() }, [])

  const stats = (() => {
    if (!rounds.length) return null
    const scores = rounds.map(r => r.score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const best = Math.min(...scores)
    let trend = null
    if (rounds.length >= 6) {
      const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const old = scores.slice(-3).reduce((a, b) => a + b, 0) / 3
      trend = recent - old
    }
    return { avg: Math.round(avg * 10) / 10, best, rounds: rounds.length, trend }
  })()

  const wagerRounds = rounds.filter(r => r.wager_type)
  const wagerStats = (() => {
    if (!wagerRounds.length) return null
    const won = wagerRounds.filter(r => r.wager_result === 'Won').length
    const lost = wagerRounds.filter(r => r.wager_result === 'Lost').length
    const tied = wagerRounds.filter(r => r.wager_result === 'Tied').length
    return { won, lost, tied, total: wagerRounds.length }
  })()

  return (
    <div className="flex flex-col h-full">
      <div className="page-header">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-black">Rounds 📋</h1>
            <p className="text-white/70 text-xs">{CURRENT_SEASON} season</p>
          </div>
          <button onClick={() => setShowLog(true)} className="text-sm bg-white text-[#1D9E75] px-4 py-2 rounded-[10px] font-bold shadow-sm">
            + Log round
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('rounds')} className={`pill flex-1 py-1.5 ${activeTab === 'rounds' ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}>Rounds</button>
          <button onClick={() => setActiveTab('bets')} className={`pill flex-1 py-1.5 ${activeTab === 'bets' ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}>Friendly bets</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {activeTab === 'rounds' ? (
          <>
            {stats && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-[#1D9E75]">{stats.avg}</p>
                  <p className="text-xs text-gray-500 mt-1">Avg score</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-[#1D9E75]">{stats.rounds}</p>
                  <p className="text-xs text-gray-500 mt-1">Rounds played</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-[#1D9E75]">{stats.best}</p>
                  <p className="text-xs text-gray-500 mt-1">Best round</p>
                </div>
                <div className="card p-4 text-center">
                  {stats.trend != null ? (
                    <>
                      <p className={`text-2xl font-bold ${stats.trend < 0 ? 'text-[#1D9E75]' : 'text-red-400'}`}>
                        {stats.trend < 0 ? '↓' : '↑'} {Math.abs(Math.round(stats.trend * 10) / 10)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{stats.trend < 0 ? 'Improving' : 'Trending up'}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-300">–</p>
                      <p className="text-xs text-gray-500 mt-1">Trend (6+ rounds)</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold text-gray-700">No rounds logged yet</p>
                <p className="text-sm text-gray-400 mt-1">Start tracking your {CURRENT_SEASON} season.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rounds.map(r => (
                  <div key={r.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{r.course_name}</p>
                        {r.wager_type && <WagerBadge result={r.wager_result} />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {r.profiles?.name && ` · with ${r.profiles.name}`}
                      </p>
                      {r.wager_type && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {r.wager_type}{r.wager_amount ? ` · ${r.wager_amount} units` : ''}{r.wager_opponent && friendMap[r.wager_opponent] ? ` vs ${friendMap[r.wager_opponent].name}` : ''}
                        </p>
                      )}
                      {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{r.notes}"</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#1D9E75]">{r.score}</p>
                      <p className="text-xs text-gray-400">score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {wagerStats && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{wagerStats.won}</p>
                  <p className="text-xs text-gray-500 mt-1">Won</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{wagerStats.lost}</p>
                  <p className="text-xs text-gray-500 mt-1">Lost</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-gray-400">{wagerStats.tied}</p>
                  <p className="text-xs text-gray-500 mt-1">Tied</p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-300 text-center mb-4">For entertainment purposes only</p>

            {wagerRounds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🤝</p>
                <p className="font-semibold text-gray-700">No friendly bets yet</p>
                <p className="text-sm text-gray-400 mt-1">Log a round and add a bet to track it here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wagerRounds.map(r => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{r.course_name}</p>
                      <WagerBadge result={r.wager_result} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' · '}{r.wager_type}
                      {r.wager_amount ? ` · ${r.wager_amount} units` : ''}
                      {r.wager_opponent && friendMap[r.wager_opponent] ? ` vs ${friendMap[r.wager_opponent].name}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showLog && (
        <LogRoundModal userId={user.id} friends={friends} onClose={() => setShowLog(false)} onLogged={fetchRounds} />
      )}
    </div>
  )
}
