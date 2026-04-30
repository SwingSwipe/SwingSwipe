import Avatar from './Avatar'

const VIBE_COLORS = {
  casual: 'bg-blue-100 text-blue-700',
  bread_game: 'bg-yellow-100 text-yellow-700',
  competitive: 'bg-red-100 text-red-700',
  fast_pace: 'bg-purple-100 text-purple-700',
  walking_only: 'bg-green-100 text-green-700',
}

const VIBE_LABELS = {
  casual: 'Casual',
  bread_game: '🍞 Bread game',
  competitive: '🏆 Competitive',
  fast_pace: '⚡ Fast pace',
  walking_only: '🚶 Walking only',
}

const SKILL_LABELS = {
  all_welcome: 'All welcome',
  sub_100: 'Sub-100',
  sub_90: 'Sub-90',
  sub_80: 'Sub-80',
  scratch: 'Scratch',
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export default function RoundCard({ listing, onJoin, currentUserId, onChat, requested }) {
  const spotsLeft = listing.spots_total - listing.spots_filled
  const isHost = listing.host_id === currentUserId
  const isFull = spotsLeft === 0

  return (
    <div className="card p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-[15px] leading-tight">{listing.course_name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(listing.date)} · {formatTime(listing.tee_time)}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isFull ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-[#1D9E75]'}`}>
            {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} open`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Avatar name={listing.profiles?.name} url={listing.profiles?.avatar_url} size={7} />
        <span className="text-sm text-gray-600">{listing.profiles?.name || 'Unknown'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {listing.vibe && (
          <span className={`pill text-xs ${VIBE_COLORS[listing.vibe] || 'bg-gray-100 text-gray-600'}`}>
            {VIBE_LABELS[listing.vibe] || listing.vibe}
          </span>
        )}
        {listing.skill_range && (
          <span className="pill bg-gray-100 text-gray-600 text-xs">
            {SKILL_LABELS[listing.skill_range] || listing.skill_range}
          </span>
        )}
      </div>

      {listing.notes && (
        <p className="text-xs text-gray-500 mb-3 italic">"{listing.notes}"</p>
      )}

      <div className="flex gap-2">
        {isHost ? (
          <button onClick={() => onChat?.(listing)} className="btn-secondary py-2 text-sm flex-1">
            View chat
          </button>
        ) : (
          <button
            onClick={() => !requested && !isFull && onJoin?.(listing)}
            disabled={isFull || requested}
            className={`py-2 text-sm flex-1 rounded-[8px] font-semibold transition-opacity ${
              isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : requested ? 'bg-green-50 text-[#1D9E75] cursor-default'
              : 'bg-[#1D9E75] text-white active:opacity-80'
            }`}
          >
            {isFull ? 'Full' : requested ? '✓ Requested' : 'Request to join'}
          </button>
        )}
      </div>
    </div>
  )
}
