import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import DealCard from '../components/DealCard'

const CATEGORIES = ['all', 'irons', 'drivers', 'wedges', 'putters', 'bags', 'accessories']

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  const fetchDeals = async () => {
    setLoading(true)
    let query = supabase
      .from('deals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (activeCategory !== 'all') query = query.eq('category', activeCategory)

    const { data } = await query
    setDeals(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDeals() }, [activeCategory])

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold mb-3">Deals</h1>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`pill capitalize whitespace-nowrap ${activeCategory === c ? 'pill-active' : 'pill-inactive'}`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="font-semibold text-gray-700">No deals right now</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon for curated club deals.</p>
          </div>
        ) : (
          deals.map(deal => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>
    </div>
  )
}
