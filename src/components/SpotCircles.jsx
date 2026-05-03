import Avatar from './Avatar'

export default function SpotCircles({ players = [], total = 4, host, occupiedCount, className = '' }) {
  const known = [
    ...(host ? [{ ...host, id: host.id || 'host' }] : []),
    ...players,
  ].slice(0, total)
  const targetOccupied = Math.min(total, Math.max(known.length, occupiedCount || known.length))
  const occupied = [
    ...known,
    ...Array.from({ length: Math.max(0, targetOccupied - known.length) }).map((_, idx) => ({
      id: `player-${idx}`,
      name: 'Player',
    })),
  ]
  const open = Math.max(0, total - occupied.length)

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-2">
        {occupied.map((p, idx) => (
          <Avatar
            key={p.id || `${p.name}-${idx}`}
            name={p.name}
            url={p.avatar_url}
            size={8}
          />
        ))}
        {Array.from({ length: open }).map((_, idx) => (
          <div
            key={`open-${idx}`}
            className="w-8 h-8 rounded-full border-2 border-dashed border-[#1D9E75]/35 bg-[#e8f5ef] text-[#1D9E75] flex items-center justify-center text-sm font-black"
          >
            +
          </div>
        ))}
      </div>
      <span className="ml-3 text-xs font-extrabold text-gray-500">
        {occupied.length}/{total}
      </span>
    </div>
  )
}
