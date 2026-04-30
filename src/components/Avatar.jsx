export default function Avatar({ url, name, size = 10 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const colors = ['bg-emerald-400', 'bg-blue-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400']
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover border-2 border-white`}
      />
    )
  }

  return (
    <div
      className={`w-${size} h-${size} rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-semibold border-2 border-white`}
      style={{ fontSize: size < 8 ? '10px' : '14px' }}
    >
      {initials}
    </div>
  )
}
