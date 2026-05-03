import { useState, useCallback, useEffect } from 'react'

let _showToast = null

export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, type = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => { _showToast = show }, [show])

  return { toast, show }
}

export function showToast(message, type = 'error') {
  _showToast?.(message, type)
}

export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-4 left-4 right-4 z-[100] px-4 py-3 rounded-[12px] shadow-lg flex items-center gap-3 transition-all ${
      toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#1D9E75] text-white'
    }`}>
      <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✓'}</span>
      <p className="text-sm font-semibold">{toast.message}</p>
    </div>
  )
}
