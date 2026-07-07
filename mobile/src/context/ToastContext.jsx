import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((type, message) => {
    setToast({ type, message })
    window.clearTimeout(show._t)
    show._t = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const success = useCallback((m) => show('success', m), [show])
  const error = useCallback((m) => show('error', m), [show])
  const dismiss = useCallback(() => setToast(null), [])

  return (
    <ToastContext.Provider value={{ toast, success, error, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
