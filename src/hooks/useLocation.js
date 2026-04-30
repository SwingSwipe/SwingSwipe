import { useState, useEffect } from 'react'

export function useLocation() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        // Default to Long Island, NY if denied
        setLocation({ lat: 40.7891, lng: -73.1350 })
        setError('Location access denied — using Long Island, NY')
      }
    )
  }, [])

  return { location, error }
}
