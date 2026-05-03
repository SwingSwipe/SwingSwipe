import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from './Avatar'
import Modal from './Modal'

const HANDICAP_LABELS = { beginner: 'Beginner', '90s': '90s shooter', '80s': '80s shooter', '70s': '70s shooter', scratch: 'Scratch' }
const PACE_LABELS = { fast: '⚡ Fast', moderate: '🚶 Moderate', relaxed: '😌 Relaxed' }
const VIBE_LABELS = { bread_game: '🍞 Bread game', casual: '😊 Casual', competitive: '🏆 Competitive', social: '🤝 Social', practice_focused: '🎯 Practice focused' }

const REPORT_REASONS = ['No-show', 'Slow play', 'Inappropriate behavior', 'Spam / fake profile', 'Other']

function profileStrength(profile) {
  const checks = [
    Boolean(profile.avatar_url),
    Boolean(profile.handicap_range || profile.avg_score),
    Boolean(profile.pace),
    Boolean(profile.cart_or_walk),
    Boolean(profile.home_course || profile.location),
    Boolean(profile.vibe_tags?.length),
  ]
  return checks.filter(Boolean).length
}

export default function PublicProfileModal({ userId, currentUserId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState('none')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: prof }, { data: ratings }, { data: friend }, { data: req }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('player_ratings').select('stars, tags').eq('rated_id', userId),
        supabase.from('friends').select('id').eq('user_id', currentUserId).eq('friend_id', userId).maybeSingle(),
        supabase.from('friend_requests').select('id').eq('from_id', currentUserId).eq('to_id', userId).eq('status', 'pending').maybeSingle(),
      ])
      setProfile(prof)
      if (ratings?.length) {
        const avg = ratings.reduce((a, r) => a + r.stars, 0) / ratings.length
        const tagCounts = {}
        ratings.forEach(r => r.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
        const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
        setReputation({ avg: Math.round(avg * 10) / 10, count: ratings.length, topTags })
      }
      if (friend) setFriendStatus('friends')
      else if (req) setFriendStatus('sent')
      setLoading(false)
    }
    load()
  }, [userId])

  const sendRequest = async () => {
    await supabase.from('friend_requests').insert({ from_id: currentUserId, to_id: userId, status: 'pending' })
    setFriendStatus('sent')
  }

  const submitReport = async (reason) => {
    await supabase.from('reports').upsert({ reporter_id: currentUserId, reported_id: userId, reason }, { onConflict: 'reporter_id,reported_id' })
    setReporting(false)
    setReportDone(true)
  }

  return (
    <Modal>
      <>
        <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] max-h-[85vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-5" />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !profile ? null : (
            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                <Avatar name={profile.name} url={profile.avatar_url} size={16} />
                <div className="flex-1">
                  <p className="font-black text-xl">{profile.name}</p>
                  <p className="text-sm text-gray-400">📍 {profile.home_course || profile.location || 'No home course'}</p>
                  {reputation?.count >= 3 ? (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-400 text-sm">{'★'.repeat(Math.round(reputation.avg))}{'☆'.repeat(5 - Math.round(reputation.avg))}</span>
                      <span className="text-xs text-gray-500">{reputation.avg} ({reputation.count})</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">New player</p>
                  )}
                </div>
              </div>

              {/* Reputation tags */}
              {reputation?.topTags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {reputation.topTags.map(tag => (
                    <span key={tag} className="pill bg-[#1D9E75]/10 text-[#1D9E75] text-xs font-semibold">✓ {tag}</span>
                  ))}
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-[12px] p-3 text-center">
                  <p className="font-bold text-[#1D9E75]">{HANDICAP_LABELS[profile.handicap_range] || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Skill level</p>
                </div>
                <div className="bg-gray-50 rounded-[12px] p-3 text-center">
                  <p className="font-bold text-[#1D9E75]">{profile.avg_score || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Avg score</p>
                </div>
              </div>

              <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/10 rounded-[12px] p-3 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Trust snapshot</p>
                  <span className="text-xs font-black text-[#1D9E75]">{profileStrength(profile)}/6 set</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-gray-600">{profile.pace ? PACE_LABELS[profile.pace] : 'Pace not set'}</p>
                  <p className="text-gray-600">
                    {profile.cart_or_walk === 'cart' ? 'Cart player' : profile.cart_or_walk === 'walking' ? 'Walks' : profile.cart_or_walk === 'either' ? 'Cart or walk' : 'Cart/walk not set'}
                  </p>
                  <p className="text-gray-600">{profile.home_course || profile.location || 'Area not set'}</p>
                  <p className="text-gray-600">{reputation?.count ? `${reputation.count} rating${reputation.count !== 1 ? 's' : ''}` : 'New reputation'}</p>
                </div>
              </div>

              {/* Vibe */}
              <div className="flex flex-wrap gap-2 mb-5">
                {profile.pace && <span className="pill bg-blue-50 text-blue-600">{PACE_LABELS[profile.pace]}</span>}
                {profile.cart_or_walk && (
                  <span className="pill bg-gray-100 text-gray-700">
                    {profile.cart_or_walk === 'cart' ? '🛺 Cart' : profile.cart_or_walk === 'walking' ? '🚶 Walking' : '🛺/🚶 Either'}
                  </span>
                )}
                {profile.vibe_tags?.map(tag => (
                  <span key={tag} className="pill bg-green-50 text-green-700">{VIBE_LABELS[tag] || tag}</span>
                ))}
              </div>

              {profile.bio_prompt && (
                <div className="bg-gray-50 rounded-[12px] p-3 mb-5">
                  <p className="text-xs text-gray-400 mb-1">Best course played</p>
                  <p className="text-sm font-semibold">{profile.bio_prompt}</p>
                </div>
              )}

              {/* Action */}
              {currentUserId !== userId && (
                <>
                  {friendStatus === 'friends' ? (
                    <div className="btn-primary opacity-60 text-center">✓ Friends</div>
                  ) : friendStatus === 'sent' ? (
                    <div className="btn-primary opacity-60 text-center">Request sent</div>
                  ) : (
                    <button onClick={sendRequest} className="btn-primary">+ Add to crew</button>
                  )}
                  <div className="mt-4 text-center">
                    {reportDone ? (
                      <p className="text-xs text-gray-400">✓ Report submitted — thanks for keeping SwingSwipe safe.</p>
                    ) : (
                      <button onClick={() => setReporting(true)} className="text-xs text-gray-400 underline">Report this player</button>
                    )}
                  </div>
                </>
              )}

              {/* Report sheet */}
              {reporting && (
                <div className="fixed inset-0 z-[70] flex flex-col justify-end">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setReporting(false)} />
                  <div className="relative bg-white rounded-t-[24px] p-6 z-10">
                    <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                    <h3 className="font-black text-base mb-1">Report player</h3>
                    <p className="text-sm text-gray-400 mb-4">Select a reason</p>
                    <div className="space-y-2">
                      {REPORT_REASONS.map(reason => (
                        <button key={reason} onClick={() => submitReport(reason)}
                          className="w-full text-left px-4 py-3 rounded-[12px] bg-gray-50 text-sm font-medium active:bg-gray-100">
                          {reason}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setReporting(false)} className="w-full text-center text-sm text-gray-400 mt-4">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    </Modal>
  )
}
