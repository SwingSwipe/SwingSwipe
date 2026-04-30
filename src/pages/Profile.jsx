import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import AvatarUpload from '../components/AvatarUpload'
import Modal from '../components/Modal'

const HANDICAP_LABELS = { beginner: 'Beginner', '90s': '90s shooter', '80s': '80s shooter', '70s': '70s shooter', scratch: 'Scratch' }
const PACE_LABELS = { fast: '⚡ Fast', moderate: '🚶 Moderate', relaxed: '😌 Relaxed' }
const VIBE_LABELS = { bread_game: '🍞 Bread game', casual: '😊 Casual', competitive: '🏆 Competitive', social: '🤝 Social', practice_focused: '🎯 Practice focused' }

const POSITIVE_TAGS = ['Fast pace', 'Great attitude', 'Competitive', 'Fun to play with', 'Punctual', 'Would play again']

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
          <input className="input-field" placeholder="Home course" value={form.home_course} onChange={e => set('home_course', e.target.value)} />
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
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // Round stats
    const { data: rounds } = await supabase.from('round_logs').select('score')
      .eq('user_id', user.id).gte('date', `${new Date().getFullYear()}-01-01`)
    if (rounds?.length) {
      const scores = rounds.map(r => r.score)
      setStats({
        count: scores.length,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
        best: Math.min(...scores),
      })
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-black">Profile</h1>
          <button onClick={() => setShowEdit(true)} className="text-sm bg-white text-[#1D9E75] px-3 py-1.5 rounded-[10px] font-bold shadow-sm">
            Edit
          </button>
        </div>
      </div>

      {/* Profile card — overlaps header */}
      <div className="px-4 -mt-6">
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <Avatar name={profile.name} url={profile.avatar_url} size={16} />
            <div className="flex-1">
              <p className="font-black text-xl">{profile.name}</p>
              <p className="text-sm text-gray-400">📍 {profile.home_course || profile.location || 'No home course set'}</p>
              {reputation?.count >= 3 ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400">{'★'.repeat(Math.round(reputation.avg))}{'☆'.repeat(5 - Math.round(reputation.avg))}</span>
                  <span className="text-xs text-gray-500">{reputation.avg} ({reputation.count} ratings)</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No ratings yet · play 3+ rated rounds to show score</p>
              )}
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

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {/* Stats */}
        {stats && (
          <div>
            <p className="section-label">This season</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3 text-center">
                <p className="text-xl font-black text-[#1D9E75]">{stats.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">Rounds</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-black text-[#1D9E75]">{stats.avg}</p>
                <p className="text-xs text-gray-500 mt-0.5">Avg score</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-black text-[#1D9E75]">{stats.best}</p>
                <p className="text-xs text-gray-500 mt-0.5">Best round</p>
              </div>
            </div>
          </div>
        )}

        {/* Golfer card */}
        <div>
          <p className="section-label">Your golfer card</p>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Skill level</p>
              <span className="pill bg-[#1D9E75]/10 text-[#1D9E75] font-bold">
                {HANDICAP_LABELS[profile.handicap_range] || 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Pace</p>
              <span className="text-sm font-semibold">{PACE_LABELS[profile.pace] || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Cart/Walk</p>
              <span className="text-sm font-semibold">
                {profile.cart_or_walk === 'cart' ? '🛺 Cart' : profile.cart_or_walk === 'walking' ? '🚶 Walking' : profile.cart_or_walk === 'either' ? 'Either' : 'Not set'}
              </span>
            </div>
            {profile.vibe_tags?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Vibe</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.vibe_tags.map(tag => (
                    <span key={tag} className="pill bg-green-50 text-green-700 text-xs">{VIBE_LABELS[tag] || tag}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.availability?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Available</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.availability.map(a => (
                    <span key={a} className="pill bg-gray-100 text-gray-600 text-xs capitalize">{a.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.bio_prompt && (
              <div className="pt-1 border-t border-gray-50">
                <p className="text-xs text-gray-400">Best course played</p>
                <p className="text-sm font-semibold mt-0.5">{profile.bio_prompt}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} className="w-full py-3 text-sm text-red-400 font-semibold">
          Sign out
        </button>
      </div>

      {showEdit && (
        <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSaved={fetchProfile} />
      )}
    </div>
  )
}
