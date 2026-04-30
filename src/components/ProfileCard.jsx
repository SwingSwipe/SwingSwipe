import Avatar from './Avatar'

const AVAIL_LABELS = {
  weekend_mornings: 'Weekend AM',
  weekday_mornings: 'Weekday AM',
  weekend_afternoons: 'Weekend PM',
  flexible: 'Flexible',
}

const VIBE_LABELS = {
  bread_game: '🍞 Bread game',
  casual: '😊 Casual',
  competitive: '🏆 Competitive',
  social: '🤝 Social',
  practice_focused: '🎯 Practice',
}

export default function ProfileCard({ profile, matchScore, matchReason, onPass, onLike, style, dragHandlers }) {
  if (!profile) return null

  return (
    <div
      className="swipe-card card overflow-hidden w-full max-w-sm mx-auto select-none"
      style={style}
      {...dragHandlers}
    >
      {/* Header photo area */}
      <div className="h-36 bg-gradient-to-br from-[#1D9E75] to-emerald-700 flex items-center justify-center relative">
        <Avatar name={profile.name} url={profile.avatar_url} size={20} />
        {matchScore != null && (
          <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 shadow-md">
            <span className="text-[#1D9E75] font-bold text-sm">{matchScore}% match</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-baseline justify-between mb-0.5">
          <h2 className="text-xl font-bold">{profile.name}</h2>
          {profile.handicap_range && (
            <span className="text-sm text-gray-500">{profile.handicap_range}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-1">{profile.location || 'Long Island, NY'}</p>

        {profile.home_course && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Home course:</span> {profile.home_course}
          </p>
        )}

        {profile.avg_score && (
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Avg score:</span> {profile.avg_score}
          </p>
        )}

        {/* Availability pills */}
        {profile.availability?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {profile.availability.map(a => (
              <span key={a} className="pill bg-blue-50 text-blue-700 text-xs">
                {AVAIL_LABELS[a] || a}
              </span>
            ))}
          </div>
        )}

        {/* Vibe pills */}
        {profile.vibe_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.vibe_tags.map(v => (
              <span key={v} className="pill bg-green-50 text-[#1D9E75] text-xs">
                {VIBE_LABELS[v] || v}
              </span>
            ))}
          </div>
        )}

        {profile.bio_prompt && (
          <p className="text-sm text-gray-500 italic mb-3">
            "Best course I've played: {profile.bio_prompt}"
          </p>
        )}

        {matchReason && (
          <p className="text-xs text-gray-400 mb-4">{matchReason}</p>
        )}

        {/* Action buttons */}
        {(onPass || onLike) && (
          <div className="flex gap-4 justify-center pt-2">
            <button
              onClick={onPass}
              className="w-14 h-14 rounded-full border-2 border-red-300 flex items-center justify-center text-red-400 text-2xl active:scale-95 transition-transform"
            >
              ✕
            </button>
            <button
              onClick={onLike}
              className="w-14 h-14 rounded-full border-2 border-[#1D9E75] flex items-center justify-center text-[#1D9E75] text-2xl active:scale-95 transition-transform"
            >
              ♥
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
