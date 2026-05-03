import { useState } from 'react'
import { supabase } from '../supabase'
import Avatar from './Avatar'
import Modal from './Modal'

const RATING_TAGS = {
  positive: ['Fast pace', 'Great attitude', 'Competitive', 'Fun to play with', 'Punctual', 'Would play again'],
  negative: ['Slow player', 'No-show', 'Poor attitude', 'Not recommended'],
}

export default function RatePlayersModal({ listing, currentUserId, players, onClose, onDone }) {
  const [ratings, setRatings] = useState({})
  const [saving, setSaving] = useState(false)

  const setRating = (playerId, key, val) => {
    setRatings(r => ({ ...r, [playerId]: { ...r[playerId], [key]: val } }))
  }

  const toggleTag = (playerId, tag) => {
    setRatings(r => {
      const tags = r[playerId]?.tags || []
      return {
        ...r,
        [playerId]: {
          ...r[playerId],
          tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag],
        },
      }
    })
  }

  const submit = async () => {
    setSaving(true)
    const inserts = Object.entries(ratings)
      .filter(([, r]) => r.stars)
      .map(([playerId, r]) => ({
        rater_id: currentUserId,
        rated_id: playerId,
        listing_id: listing.id,
        stars: r.stars,
        tags: r.tags || [],
      }))

    if (inserts.length) {
      await supabase.from('player_ratings').upsert(inserts, { onConflict: 'rater_id,rated_id,listing_id' })
    }
    setSaving(false)
    onDone?.()
    onClose()
  }

  const othersToRate = players.filter(p => p.id !== currentUserId)

  return (
    <Modal>
    <>
    <div className="fixed inset-0 bg-black/60 z-[60]" />
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-black mb-1">Rate your playing partners</h2>
        <p className="text-sm text-gray-400 mb-5">Helps other golfers find great playing partners.</p>

        {othersToRate.map(player => (
          <div key={player.id} className="mb-6 pb-6 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={player.name} url={player.avatar_url} size={10} />
              <p className="font-bold">{player.name?.split(' ')[0]} {player.name?.split(' ')[1]?.[0]}.</p>
            </div>

            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(player.id, 'stars', star)}
                  className={`text-3xl transition-all ${(ratings[player.id]?.stars || 0) >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            {ratings[player.id]?.stars && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Add tags (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {[...RATING_TAGS.positive, ...RATING_TAGS.negative].map(tag => {
                    const isNeg = RATING_TAGS.negative.includes(tag)
                    const selected = ratings[player.id]?.tags?.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(player.id, tag)}
                        className={`pill text-xs py-1 transition-all ${
                          selected
                            ? isNeg ? 'bg-red-500 text-white' : 'bg-[#1D9E75] text-white'
                            : isNeg ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        <button onClick={submit} className="btn-primary" disabled={saving || Object.keys(ratings).length === 0}>
          {saving ? 'Saving…' : 'Submit ratings'}
        </button>
        <button onClick={onClose} className="w-full text-center text-sm text-gray-400 mt-3">Skip for now</button>
      </div>
    </>
    </Modal>
  )
}
