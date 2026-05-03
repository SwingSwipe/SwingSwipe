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

const TRANSPORT_LABELS = {
  cart: '🛺 Cart',
  walk: '🚶 Walk',
  either: '🔄 Cart or walk',
}

const PACE_LABELS = {
  quick: '⚡ Quick (~3h)',
  normal: '⏱ Normal (~4h)',
  relaxed: '☕ Relaxed (4.5h+)',
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

function FoursomeStrip({ host, total = 4, filled = 1 }) {
  const occupied = Math.min(total, Math.max(1, filled))
  const open = Math.max(0, total - occupied)

  return (
    <div className="bg-[#1D9E75]/5 rounded-[12px] px-3 py-2 mb-3 flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex -space-x-1.5">
          <Avatar name={host?.name} url={host?.avatar_url} size={7} />
          {Array.from({ length: Math.max(0, occupied - 1) }).map((_, idx) => (
            <div key={`filled-${idx}`} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
              ?
            </div>
          ))}
          {Array.from({ length: open }).map((_, idx) => (
            <div key={`open-${idx}`} className="w-7 h-7 rounded-full bg-white border-2 border-dashed border-[#1D9E75]/35 flex items-center justify-center text-xs font-black text-[#1D9E75]">
              +
            </div>
          ))}
        </div>
        <p className="ml-3 text-xs font-bold text-gray-600">{occupied}/{total} players</p>
      </div>
      <p className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-wide">{open > 0 ? `${open} open` : 'Full'}</p>
    </div>
  )
}

export default function RoundCard({ listing, onJoin, onCancel, currentUserId, onChat, requested }) {
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

      <FoursomeStrip
        host={listing.profiles}
        total={listing.spots_total || 4}
        filled={listing.spots_filled || 1}
      />

      <div className="flex flex-wrap gap-1.5 mb-3">
        {listing.holes && (
          <span className="pill bg-gray-100 text-gray-600 text-xs">
            {listing.holes} holes
          </span>
        )}
        {listing.transport && listing.transport !== 'either' && (
          <span className="pill bg-gray-100 text-gray-600 text-xs">
            {TRANSPORT_LABELS[listing.transport] || listing.transport}
          </span>
        )}
        {listing.transport === 'either' && (
          <span className="pill bg-gray-100 text-gray-600 text-xs">
            {TRANSPORT_LABELS.either}
          </span>
        )}
        {listing.pace && (
          <span className="pill bg-orange-50 text-orange-600 text-xs">
            {PACE_LABELS[listing.pace] || listing.pace}
          </span>
        )}
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
        ) : requested ? (
          <>
            <div className="flex-1 py-2 text-sm rounded-[8px] font-semibold bg-green-50 text-[#1D9E75] text-center">
              ✓ Requested
            </div>
            <button
              onClick={() => onCancel?.(listing)}
              className="px-4 py-2 text-sm rounded-[8px] font-semibold bg-red-50 text-red-500 active:opacity-80"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => !isFull && onJoin?.(listing)}
            disabled={isFull}
            className={`py-2 text-sm flex-1 rounded-[8px] font-semibold transition-opacity ${
              isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#1D9E75] text-white active:opacity-80'
            }`}
          >
            {isFull ? 'Full' : 'Request to join'}
          </button>
        )}
      </div>
    </div>
  )
}
