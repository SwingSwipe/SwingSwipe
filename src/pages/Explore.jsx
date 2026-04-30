import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TEE_TIME_SITES = [
  {
    name: 'GolfNow',
    desc: 'Largest tee time marketplace',
    emoji: '⛳',
    color: 'from-green-500 to-green-700',
    url: (loc) => `https://www.golfnow.com/tee-times#${loc ? `?searchTerm=${encodeURIComponent(loc)}` : ''}`,
  },
  {
    name: 'TeeOff',
    desc: 'Best last-minute deals',
    emoji: '🏌️',
    color: 'from-blue-500 to-blue-700',
    url: () => 'https://www.teeoff.com',
  },
  {
    name: 'Supreme Golf',
    desc: 'Compare all sites at once',
    emoji: '🔍',
    color: 'from-purple-500 to-purple-700',
    url: (loc) => `https://www.supremegolf.com/search${loc ? `?searchTerm=${encodeURIComponent(loc)}` : ''}`,
  },
  {
    name: 'Chronogolf',
    desc: 'Book direct with courses',
    emoji: '📅',
    color: 'from-orange-500 to-orange-600',
    url: () => 'https://www.chronogolf.com',
  },
]

const DEAL_CATEGORIES = ['all', 'drivers', 'irons', 'wedges', 'putters', 'bags', 'accessories']

function DealCard({ deal }) {
  return (
    <div className="card mb-3 overflow-hidden">
      {deal.image_url && (
        <img src={deal.image_url} alt={deal.title} className="w-full h-36 object-cover"
          onError={e => { e.target.style.display = 'none' }} />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            {deal.brand && <p className="text-xs text-gray-400 uppercase font-bold tracking-wide mb-0.5">{deal.brand}</p>}
            <h3 className="font-bold text-sm leading-tight">{deal.title}</h3>
          </div>
          {deal.discount_pct && (
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full shrink-0">
              -{deal.discount_pct}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-black text-[#1D9E75]">${deal.price}</span>
          {deal.original_price && (
            <span className="text-sm text-gray-400 line-through">${deal.original_price}</span>
          )}
        </div>
        <a href={deal.affiliate_url} target="_blank" rel="noopener noreferrer"
          className="btn-primary py-2.5 text-sm block text-center">
          View deal →
        </a>
      </div>
    </div>
  )
}

export default function Explore() {
  const [deals, setDeals] = useState([])
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [location, setLocation] = useState('')
  const [activeTab, setActiveTab] = useState('teetimes')

  const fetchDeals = async () => {
    setLoadingDeals(true)
    let query = supabase.from('deals').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (activeCategory !== 'all') query = query.eq('category', activeCategory)
    const { data } = await query
    setDeals(data || [])
    setLoadingDeals(false)
  }

  useEffect(() => { fetchDeals() }, [activeCategory])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-white text-xl font-black mb-3">Explore 🔍</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('teetimes')}
            className={`pill flex-1 py-1.5 ${activeTab === 'teetimes' ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}
          >
            ⛳ Tee Times
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`pill flex-1 py-1.5 ${activeTab === 'deals' ? 'bg-white text-[#1D9E75] font-bold' : 'bg-white/20 text-white'}`}
          >
            💰 Gear Deals
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {activeTab === 'teetimes' ? (
          <>
            {/* Location search */}
            <div className="flex gap-2 mb-5">
              <input
                className="input-field flex-1"
                placeholder="City or course name…"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <p className="section-label">Book tee times</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {TEE_TIME_SITES.map(site => (
                <a
                  key={site.name}
                  href={site.url(location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`bg-gradient-to-br ${site.color} rounded-[16px] p-4 flex flex-col gap-2 shadow-md active:opacity-80 transition-opacity`}
                >
                  <span className="text-3xl">{site.emoji}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{site.name}</p>
                    <p className="text-white/70 text-xs mt-0.5">{site.desc}</p>
                  </div>
                </a>
              ))}
            </div>

            <p className="section-label">How it works</p>
            <div className="card p-4 space-y-3">
              {[
                { icon: '🔍', text: 'Enter your city or course name above' },
                { icon: '⛳', text: 'Pick a booking site and compare prices' },
                { icon: '📱', text: 'Book directly on their site or app' },
                { icon: '👥', text: 'Log the round in SwingSwipe after to update your leaderboard' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl">{step.icon}</span>
                  <p className="text-sm text-gray-600 leading-snug">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-[12px] p-3">
              <p className="text-xs text-[#1D9E75] font-semibold text-center">
                💡 Pro tip: Supreme Golf compares all sites at once for the best price
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
              {DEAL_CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`pill capitalize whitespace-nowrap ${activeCategory === c ? 'pill-active' : 'pill-inactive'}`}
                >
                  {c === 'all' ? 'All gear' : c}
                </button>
              ))}
            </div>

            {loadingDeals ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🏌️</p>
                <p className="font-bold text-gray-700">No deals right now</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon for curated gear deals.</p>
              </div>
            ) : (
              deals.map(deal => <DealCard key={deal.id} deal={deal} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}
