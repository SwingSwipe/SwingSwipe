const TABS = [
  {
    id: 'groups',
    label: 'Groups',
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
    id: 'crew',
    label: 'Crew',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Standings',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="14" width="4" height="8"/>
        <rect x="9" y="9" width="4" height="13"/>
        <rect x="16" y="4" width="4" height="18"/>
      </svg>
    ),
  },
  {
    id: 'rounds',
    label: 'Rounds',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth="3"/>
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth="3"/>
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth="3"/>
      </svg>
    ),
  },
  {
    id: 'deals',
    label: 'Deals',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
]

export default function BottomNav({ activeTab, onTabChange, crewNotif }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex max-w-lg mx-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center py-2 pt-3 relative"
          >
            {tab.icon(activeTab === tab.id)}
            <span
              className="text-[10px] mt-0.5 font-medium"
              style={{ color: activeTab === tab.id ? '#1D9E75' : '#9ca3af' }}
            >
              {tab.label}
            </span>
            {tab.id === 'crew' && crewNotif && (
              <span className="absolute top-2 right-[calc(50%-10px)] w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
