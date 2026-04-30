import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import RoundCard from '../components/RoundCard'

export default function Friends({ user, onNotifClear }) {
  const [friends, setFriends] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchFriends()
    onNotifClear?.()
  }, [])

  const fetchFriends = async () => {
    setLoading(true)
    const { data: friendRows } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id)

    if (!friendRows?.length) { setLoading(false); return }

    const ids = friendRows.map(f => f.friend_id)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)

    setFriends(profiles || [])

    const { data: friendListings } = await supabase
      .from('round_listings')
      .select('*, profiles(name, avatar_url)')
      .in('host_id', ids)
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    setListings(friendListings || [])
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, home_course')
      .ilike('name', `%${search}%`)
      .neq('id', user.id)
      .limit(10)
    setSearchResults(data || [])
    setSearching(false)
  }

  const addFriend = async (friendId) => {
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .maybeSingle()

    if (existing) return

    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: friendId },
      { user_id: friendId, friend_id: user.id },
    ])
    fetchFriends()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold mb-3">Friends</h1>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Search golfers by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-3 bg-[#1D9E75] text-white rounded-[8px] text-sm font-semibold"
          >
            Find
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Results</h2>
            <div className="space-y-2">
              {searchResults.map(p => (
                <div key={p.id} className="card p-3 flex items-center gap-3">
                  <Avatar name={p.name} url={p.avatar_url} size={10} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.home_course || 'No home course'}</p>
                  </div>
                  <button
                    onClick={() => addFriend(p.id)}
                    className="text-xs bg-[#1D9E75] text-white px-3 py-1.5 rounded-[8px] font-semibold"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Playing this week */}
            {listings.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Playing this week</h2>
                {listings.map(l => (
                  <RoundCard key={l.id} listing={l} currentUserId={user.id} />
                ))}
              </div>
            )}

            {/* Your golf crew */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your golf crew</h2>
              {friends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-3">🏌️</p>
                  <p className="font-semibold text-gray-700">No friends yet</p>
                  <p className="text-sm text-gray-400 mt-1">Search for golfers or match with someone first.</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {friends.map(f => (
                    <div key={f.id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                      <Avatar name={f.name} url={f.avatar_url} size={12} />
                      <p className="text-xs text-center text-gray-600 leading-tight max-w-[60px] truncate">
                        {f.name?.split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
