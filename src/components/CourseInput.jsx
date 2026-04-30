import { useState, useEffect, useRef } from 'react'

export default function CourseInput({ value, onChange, placeholder = 'Course name' }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Sync external value changes
  useEffect(() => { setQuery(value || '') }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const search = async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&osm_tag=leisure:golf_course`
      )
      const data = await res.json()
      const courses = (data.features || [])
        .filter(f => f.properties?.name)
        .map(f => {
          const p = f.properties
          const location = [p.city, p.state, p.country].filter(Boolean).join(', ')
          return { name: p.name, location }
        })
      setResults(courses)
      setOpen(courses.length > 0)
    } catch {
      setResults([])
    }
    setLoading(false)
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (course) => {
    setQuery(course.name)
    onChange(course.name)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          className="input-field pr-8"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[12px] shadow-lg border border-gray-100 z-50 overflow-hidden">
          {results.map((course, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(course)}
              onTouchStart={() => handleSelect(course)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0"
            >
              <p className="text-sm font-semibold text-gray-800">{course.name}</p>
              {course.location && (
                <p className="text-xs text-gray-400 mt-0.5">{course.location}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
