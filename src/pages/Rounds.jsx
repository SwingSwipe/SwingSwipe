import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CURRENT_SEASON = new Date().getFullYear()

function LogRoundModal({ userId, friends, onClose, onLogged }) {
  const [form, setForm] = useState({ course_name: '', date: '', score: '', playing_with: '', notes: '' })
  const [saving, setSaving] = useState(false)

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
    })

    if (!error) {
      const { data: allRounds } = await supabase
        .from('round_logs')
        .select('score')
        .eq('user_id', userId)
        .gte('date', `${CURRENT_SEASON}-01-01`)

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-[20px] p-6 max-h-[85vh] overflow-y-auto">
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

          <button onClick={submit} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log Round'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Rounds({ user }) {
  const [rounds, setRounds] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)

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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Rounds</h1>
          <p className="text-sm text-gray-400">{CURRENT_SEASON} season</p>
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="text-sm bg-[#1D9E75] text-white px-4 py-2 rounded-[8px] font-semibold"
        >
          + Log round
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Stats grid */}
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
                  <p className="font-semibold text-sm">{r.course_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {r.profiles?.name && ` · with ${r.profiles.name}`}
                  </p>
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
      </div>

      {showLog && (
        <LogRoundModal
          userId={user.id}
          friends={friends}
          onClose={() => setShowLog(false)}
          onLogged={fetchRounds}
        />
      )}
    </div>
  )
}
