import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return createPortal(children, document.body)
}
