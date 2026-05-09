import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import AvatarUpload from '../components/AvatarUpload'
import Modal from '../components/Modal'
import CourseInput from '../components/CourseInput'
import ConfirmSheet from '../components/ConfirmSheet'
import { showToast } from '../components/Toast'
import { fetchActiveChallengeMatchesForRound, formatRoundChallengeToast } from '../utils/crewChallenges'

function LogRoundModal({ userId, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ course: '', date: today, score: '', holes: '18' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.course || !form.date || !form.score) return
    setSaving(true)
    setError('')
    const roundPayload = {
      user_id: userId,
      course_name: form.course,
      date: form.date,
      score: parseInt(form.score),
      holes: parseInt(form.holes),
    }
    const { data: savedRound, error: saveError } = await supabase
      .from('round_logs')
      .insert(roundPayload)
      .select('id, user_id, score, date, holes')
      .single()

    if (saveError) {
      setError(`Could not save round: ${saveError.message}`)
      showToast(`Could not save round: ${saveError.message}`)
      setSaving(false)
      return
    }

    const matches = await fetchActiveChallengeMatchesForRound(supabase, userId, savedRound || roundPayload)
    showToast(formatRoundChallengeToast(matches), 'success')
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] p-6">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
      <h2 className="text-lg font-black mb-1">Log a round ⛳</h2>
      <p className="text-sm text-gray-400 mb-5">Add it to your season stats</p>
      <div className="space-y-3">
        <CourseInput placeholder="Course played" value={form.course} onChange={v => set('course', v)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Score</label>
            <input className="input-field" type="number" placeholder="e.g. 87" value={form.score} onChange={e => set('score', e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Holes</label>
          <div className="flex gap-2">
            {[['9', '9 holes'], ['18', '18 holes']].map(([v, l]) => (
              <button key={v} onClick={() => set('holes', v)}
                className={`pill flex-1 py-1.5 ${form.holes === v ? 'pill-active' : 'pill-inactive'}`}>{l}</button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={save} className="btn-primary" disabled={saving || !form.course || !form.score}>
          {saving ? 'Saving…' : 'Save round'}
        </button>
      </div>
    </div>
    </>
    </Modal>
  )
}

const HANDICAP_LABELS = { beginner: 'Beginner', '90s': '90s shooter', '80s': '80s shooter', '70s': '70s shooter', scratch: 'Scratch' }
const PACE_LABELS = { fast: '⚡ Fast', moderate: '🚶 Moderate', relaxed: '😌 Relaxed' }
const VIBE_LABELS = { bread_game: '🍞 Bread game', casual: '😊 Casual', competitive: '🏆 Competitive', social: '🤝 Social', practice_focused: '🎯 Practice focused' }
const CART_LABELS = { cart: '🛺 Cart', walking: '🚶 Walking', either: 'Either' }
const AVAILABILITY_LABELS = {
  weekend_mornings: 'Weekend AM',
  weekday_mornings: 'Weekday AM',
  weekend_afternoons: 'Weekend PM',
  flexible: 'Flexible',
}

const POSITIVE_TAGS = ['Fast pace', 'Great attitude', 'Competitive', 'Fun to play with', 'Punctual', 'Would play again']

function getProfileSignals(profile) {
  const signals = [
    { key: 'photo', label: 'Photo', done: Boolean(profile.avatar_url) },
    { key: 'location', label: 'Course', done: Boolean(profile.home_course || profile.location) },
    { key: 'skill', label: 'Skill', done: Boolean(profile.handicap_range) },
    { key: 'pace', label: 'Pace', done: Boolean(profile.pace) },
    { key: 'style', label: 'Style', done: Boolean(profile.cart_or_walk) },
    { key: 'vibe', label: 'Vibe', done: Boolean(profile.vibe_tags?.length) },
  ]
  const complete = signals.filter(s => s.done).length
  return { signals, complete, total: signals.length, pct: Math.round((complete / signals.length) * 100) }
}


const average = (values) => {
  if (!values.length) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10
}

const estimateHandicap = (avg18, avg9) => {
  if (avg18) return Math.max(Math.round((avg18 - 72) * 10) / 10, 0)
  if (avg9) return Math.max(Math.round(((avg9 * 2) - 72) * 10) / 10, 0)
  return null
}

function StatTile({ label, value, sub }) {
  return (
    <div className="bg-white rounded-[16px] border border-gray-100 p-3 shadow-sm">
      <p className="text-xl font-black text-[#064e35] leading-none">{value}</p>
      <p className="text-xs font-bold text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    location: profile.location || '',
    home_course: profile.home_course || '',
    handicap_range: profile.handicap_range || '',
    avg_score: profile.avg_score || '',
    pace: profile.pace || '',
    cart_or_walk: profile.cart_or_walk || '',
    vibe_tags: profile.vibe_tags || [],
    availability: profile.availability || [],
    bio_prompt: profile.bio_prompt || '',
    avatar_url: profile.avatar_url || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleArr = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }))

  const save = async () => {
    setSaving(true)
    await supabase.from('profiles').update({
      name: form.name,
      location: form.location,
      home_course: form.home_course,
      handicap_range: form.handicap_range,
      avg_score: form.avg_score ? parseFloat(form.avg_score) : null,
      pace: form.pace,
      cart_or_walk: form.cart_or_walk,
      vibe_tags: form.vibe_tags,
      availability: form.availability,
      bio_prompt: form.bio_prompt,
      avatar_url: form.avatar_url || null,
    }).eq('id', profile.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-black mb-5">Edit Profile</h2>
        <div className="space-y-4">
          <AvatarUpload
            userId={profile.id}
            name={form.name}
            currentUrl={form.avatar_url}
            onUploaded={url => set('avatar_url', url)}
          />
          <input className="input-field" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
          <input className="input-field" placeholder="Location (e.g. New York, NY)" value={form.location} onChange={e => set('location', e.target.value)} />
          <CourseInput placeholder="Home course" value={form.home_course} onChange={v => set('home_course', v)} />
          <input className="input-field" type="number" placeholder="Avg score" value={form.avg_score} onChange={e => set('avg_score', e.target.value)} />

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Handicap range</label>
            <div className="flex flex-wrap gap-2">
              {['beginner', '90s', '80s', '70s', 'scratch'].map(h => (
                <button key={h} onClick={() => set('handicap_range', h)} className={`pill ${form.handicap_range === h ? 'pill-active' : 'pill-inactive'}`}>
                  {HANDICAP_LABELS[h]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Pace of play</label>
            <div className="flex gap-2">
              {['fast', 'moderate', 'relaxed'].map(p => (
                <button key={p} onClick={() => set('pace', p)} className={`pill flex-1 ${form.pace === p ? 'pill-active' : 'pill-inactive'}`}>
                  {PACE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Cart or walk?</label>
            <div className="flex gap-2">
              {[['cart', '🛺 Cart'], ['walking', '🚶 Walk'], ['either', 'Either']].map(([v, l]) => (
                <button key={v} onClick={() => set('cart_or_walk', v)} className={`pill flex-1 ${form.cart_or_walk === v ? 'pill-active' : 'pill-inactive'}`}>{l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Your vibe (up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(VIBE_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => { if (form.vibe_tags.includes(v)) toggleArr('vibe_tags', v); else if (form.vibe_tags.length < 3) toggleArr('vibe_tags', v) }}
                  className={`pill ${form.vibe_tags.includes(v) ? 'pill-active' : 'pill-inactive'}`}>{l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Availability</label>
            <div className="flex flex-wrap gap-2">
              {[['weekend_mornings', 'Weekend AM'], ['weekday_mornings', 'Weekday AM'], ['weekend_afternoons', 'Weekend PM'], ['flexible', 'Flexible']].map(([v, l]) => (
                <button key={v} onClick={() => toggleArr('availability', v)} className={`pill ${form.availability.includes(v) ? 'pill-active' : 'pill-inactive'}`}>{l}</button>
              ))}
            </div>
          </div>

          <input className="input-field" placeholder="Best course you've played" value={form.bio_prompt} onChange={e => set('bio_prompt', e.target.value)} />

          <button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </div>
    </>
    </Modal>
  )
}

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [recentRounds, setRecentRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showLogRound, setShowLogRound] = useState(false)
  const [confirmRoundDelete, setConfirmRoundDelete] = useState(null)

  const fetchProfile = async () => {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // Round stats + recent history
    const { data: rounds } = await supabase.from('round_logs').select('id, score, course_name, date, holes')
      .eq('user_id', user.id).gte('date', `${new Date().getFullYear()}-01-01`)
      .order('date', { ascending: false })
    if (rounds?.length) {
      const rounds9 = rounds.filter(r => Number(r.holes) === 9)
      const rounds18 = rounds.filter(r => Number(r.holes || 18) === 18)
      const scores9 = rounds9.map(r => r.score)
      const scores18 = rounds18.map(r => r.score)
      const avg9 = average(scores9)
      const avg18 = average(scores18)
      setStats({
        count: rounds.length,
        count9: rounds9.length,
        count18: rounds18.length,
        avg9,
        avg18,
        best9: scores9.length ? Math.min(...scores9) : null,
        best18: scores18.length ? Math.min(...scores18) : null,
        handicapEstimate: estimateHandicap(avg18, avg9),
      })
      setRecentRounds(rounds.slice(0, 5))
    } else {
      setStats(null)
      setRecentRounds([])
    }

    // Reputation
    const { data: ratings } = await supabase.from('player_ratings').select('stars, tags')
      .eq('rated_id', user.id)
    if (ratings?.length) {
      const avg = ratings.reduce((a, r) => a + r.stars, 0) / ratings.length
      const tagCounts = {}
      ratings.forEach(r => r.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t)
      setReputation({ avg: Math.round(avg * 10) / 10, count: ratings.length, topTags })
    }
    setLoading(false)
  }

  useEffect(() => {
    Promise.resolve().then(fetchProfile)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const deleteRound = async () => {
    const round = recentRounds.find(r => r.id === confirmRoundDelete)
    setConfirmRoundDelete(null)
    if (!round) return
    const { error } = await supabase.from('round_logs').delete().eq('id', round.id)
    if (error) {
      showToast(`Could not delete round: ${error.message}`)
      return
    }
    showToast('Round deleted.', 'success')
    fetchProfile()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return null

  const profileSignals = getProfileSignals(profile)
  const missingSignals = profileSignals.signals.filter(s => !s.done)
  const reputationReady = reputation?.count >= 3
  const primaryCourse = profile.home_course || profile.location || 'No home course set'
  const bestKnownScore = stats?.best18 || stats?.best9 || profile.avg_score || '—'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header pb-14">
        {/* Golf swing silhouette */}
        <svg className="absolute right-2 top-4 opacity-10" width="80" height="72" viewBox="0 0 80 72" fill="none">
          <circle cx="44" cy="12" r="10" fill="white"/>
          <path d="M44 22 C44 22 36 38 28 50 C24 56 20 60 20 64" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M44 34 C52 30 62 26 68 20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M28 50 C34 48 42 48 50 52" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Your card</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-black mb-0.5">Golfer profile</h1>
            <p className="text-white/70 text-xs">Your playing style, trust, and season stats</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="text-sm bg-white text-[#064e35] px-3 py-1.5 rounded-[10px] font-bold shadow-sm">
            Edit
          </button>
        </div>
      </div>

      {/* Profile card — overlaps header */}
      <div className="px-4 -mt-10">
        <div className="bg-white rounded-[22px] border border-gray-100 shadow-lg shadow-green-950/10 p-5">
          <div className="flex items-start gap-4">
            <Avatar name={profile.name} url={profile.avatar_url} size={16} />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-xl text-[#16231d] leading-tight">{profile.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">📍 {primaryCourse}</p>
                </div>
                <span className="shrink-0 bg-[#1D9E75]/10 text-[#064e35] text-[11px] font-black px-2.5 py-1 rounded-full">
                  {profileSignals.complete}/{profileSignals.total}
                </span>
              </div>
              {reputationReady ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400">{'★'.repeat(Math.round(reputation.avg))}{'☆'.repeat(5 - Math.round(reputation.avg))}</span>
                  <span className="text-xs text-gray-500">{reputation.avg} ({reputation.count} ratings)</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Rating unlocks after 3 rated rounds</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-[14px] bg-[#f6faf8] px-3 py-2">
              <p className="text-[10px] uppercase font-black text-gray-400">Skill</p>
              <p className="text-sm font-black text-[#064e35] truncate">{HANDICAP_LABELS[profile.handicap_range] || 'Set it'}</p>
            </div>
            <div className="rounded-[14px] bg-[#f6faf8] px-3 py-2">
              <p className="text-[10px] uppercase font-black text-gray-400">Pace</p>
              <p className="text-sm font-black text-[#064e35] truncate">{PACE_LABELS[profile.pace] || 'Set it'}</p>
            </div>
            <div className="rounded-[14px] bg-[#f6faf8] px-3 py-2">
              <p className="text-[10px] uppercase font-black text-gray-400">Best</p>
              <p className="text-sm font-black text-[#064e35] truncate">{bestKnownScore}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-black text-gray-600">Golfer card strength</p>
              <p className="text-xs font-black text-[#1D9E75]">{profileSignals.pct}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#1D9E75] h-2 rounded-full transition-all" style={{ width: `${profileSignals.pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profileSignals.signals.map(signal => (
                <span
                  key={signal.key}
                  className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                    signal.done ? 'bg-[#1D9E75]/10 text-[#064e35]' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {signal.done ? '✓' : '+'} {signal.label}
                </span>
              ))}
            </div>
          </div>

          {/* Top tags */}
          {reputation?.topTags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {reputation.topTags.filter(t => POSITIVE_TAGS.includes(t)).map(tag => (
                <span key={tag} className="pill bg-[#1D9E75]/10 text-[#1D9E75] text-xs font-semibold">✓ {tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completeness nudge */}
      {missingSignals.length > 0 && (
        <div className="mx-4 mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-[16px] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-amber-900">Make your card easier to trust</p>
              <p className="text-xs text-amber-700 mt-0.5">Add {missingSignals.slice(0, 3).map(s => s.label.toLowerCase()).join(', ')} to get better matches.</p>
            </div>
            <button onClick={() => setShowEdit(true)} className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-2 rounded-[10px] shrink-0">
              Finish
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">This season</p>
            <button onClick={() => setShowLogRound(true)} className="text-xs font-bold text-[#1D9E75] bg-[#1D9E75]/10 px-2.5 py-1 rounded-[8px]">
              + Log round
            </button>
          </div>
          {stats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Rounds" value={stats.count} sub="this year" />
                <StatTile label="9 avg" value={stats.avg9 || '—'} sub={stats.count9 ? String(stats.count9) + ' logged' : 'none yet'} />
                <StatTile label="18 avg" value={stats.avg18 || '—'} sub={stats.count18 ? String(stats.count18) + ' logged' : 'none yet'} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Best 9" value={stats.best9 || '—'} sub="challenge-ready" />
                <StatTile label="Best 18" value={stats.best18 || '—'} sub="challenge-ready" />
                <StatTile label="HCP est." value={stats.handicapEstimate ?? '—'} sub="score over par" />
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLogRound(true)} className="w-full card p-4 flex items-center gap-3 active:opacity-80">
              <div className="w-10 h-10 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-xl shrink-0">⛳</div>
              <div className="text-left">
                <p className="font-bold text-sm text-gray-800">Log your first round</p>
                <p className="text-xs text-gray-400 mt-0.5">Track your scores and see season stats</p>
              </div>
              <span className="ml-auto text-gray-300 text-lg">›</span>
            </button>
          )}
        </div>

        {/* Golfer card */}
        <div>
          <p className="section-label">Your golfer card</p>
          <div className="card p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-gray-50 p-3">
                <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Skill level</p>
                <p className="text-sm font-black text-gray-800">{HANDICAP_LABELS[profile.handicap_range] || 'Not set'}</p>
              </div>
              <div className="rounded-[14px] bg-gray-50 p-3">
                <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Transport</p>
                <p className="text-sm font-black text-gray-800">{CART_LABELS[profile.cart_or_walk] || 'Not set'}</p>
              </div>
            </div>
            <div className="rounded-[14px] bg-[#f6faf8] p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Preferred pace</p>
                <p className="text-sm font-black text-gray-800">{PACE_LABELS[profile.pace] || 'Not set'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">⏱️</div>
            </div>
            {profile.vibe_tags?.length > 0 && (
              <div>
                <p className="text-xs uppercase font-black text-gray-400 mb-2">Vibe</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.vibe_tags.map(tag => (
                    <span key={tag} className="pill bg-green-50 text-green-700 text-xs">{VIBE_LABELS[tag] || tag}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.availability?.length > 0 && (
              <div>
                <p className="text-xs uppercase font-black text-gray-400 mb-2">Available</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.availability.map(a => (
                    <span key={a} className="pill bg-gray-100 text-gray-600 text-xs">{AVAILABILITY_LABELS[a] || a.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.bio_prompt && (
              <div className="rounded-[14px] border border-gray-100 p-3">
                <p className="text-xs uppercase font-black text-gray-400">Best course played</p>
                <p className="text-sm font-black text-gray-800 mt-1">{profile.bio_prompt}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent rounds */}
        {recentRounds.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label">Recent rounds</p>
              <button onClick={() => setShowLogRound(true)} className="text-xs font-bold text-[#1D9E75] bg-[#1D9E75]/10 px-2.5 py-1 rounded-[8px]">
                + Log
              </button>
            </div>
            <div className="card divide-y divide-gray-50">
              {recentRounds.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-[12px] bg-[#1D9E75]/10 flex items-center justify-center text-lg shrink-0">⛳</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800 truncate max-w-[190px]">{r.course_name || 'Golf round'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {r.holes && ` · ${r.holes} holes`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-black text-[#064e35] leading-none">{r.score}</p>
                      <p className="text-[10px] text-gray-400">strokes</p>
                    </div>
                    <button
                      onClick={() => setConfirmRoundDelete(r.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 active:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite + sign out */}
        <div className="space-y-2">
          <button
            onClick={() => {
              const text = `Play golf with me on SwingSwipe ⛳\nFind games, join rounds, track your scores.\n${window.location.origin}`
              if (navigator.share) navigator.share({ title: 'SwingSwipe — find golfers near you', text })
              else navigator.clipboard?.writeText(window.location.origin)
            }}
            className="w-full py-3 text-sm font-semibold text-[#1D9E75] bg-[#1D9E75]/8 rounded-[12px] active:opacity-70"
          >
            ⛳ Invite a golfer
          </button>
          <button onClick={handleSignOut} className="w-full py-3 text-sm text-red-400 font-semibold">
            Sign out
          </button>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSaved={fetchProfile} />
      )}
      {showLogRound && (
        <LogRoundModal userId={user.id} onClose={() => setShowLogRound(false)} onSaved={fetchProfile} />
      )}
      {confirmRoundDelete && (
        <ConfirmSheet
          title="Delete this round?"
          message="This removes the score from your season stats."
          confirmLabel="Delete round"
          onConfirm={deleteRound}
          onCancel={() => setConfirmRoundDelete(null)}
        />
      )}
    </div>
  )
}
