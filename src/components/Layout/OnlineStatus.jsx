import { useState, useEffect } from 'react'

export default function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-xs font-mono font-semibold
        ${online ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse
          ${online ? 'bg-green-400' : 'bg-red-400'}`} />
      {online ? 'Online' : 'Offline'}
    </div>
  )
}