const TABS = [
  {
    id: 'discover',
    label: 'Discover',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    id: 'games',
    label: 'Games',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17 L3 8 Q3 6 5 6 L7 6"/><path d="M21 17 L21 8 Q21 6 19 6 L17 6"/>
        <rect x="7" y="3" width="10" height="6" rx="2"/>
        <path d="M3 17 Q3 19 5 19 L19 19 Q21 19 21 17"/>
        <circle cx="12" cy="14" r="1" fill={active ? '#1D9E75' : '#9ca3af'}/>
      </svg>
    ),
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'rounds',
    label: 'Rounds',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth="3"/>
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth="3"/>
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth="3"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav({ activeTab, onTabChange, gameNotif, crewNotif }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex max-w-lg mx-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center py-2 pt-3 relative transition-opacity active:opacity-60"
            >
              {isActive && (
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1D9E75] rounded-full" />
              )}
              {tab.icon(isActive)}
              <span className="text-[10px] mt-0.5 font-semibold" style={{ color: isActive ? '#1D9E75' : '#9ca3af' }}>
                {tab.label}
              </span>
              {tab.id === 'games' && gameNotif > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-14px)] w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border border-white">
                  {gameNotif}
                </span>
              )}
              {tab.id === 'crew' && crewNotif > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-14px)] w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border border-white">
                  {crewNotif}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
