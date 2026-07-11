'use client'

import { useEffect, useState } from 'react'

export interface NetworkStatus {
  isOffline: boolean
}

/**
 * Lightweight online/offline signal. Backed by navigator.onLine + the
 * online/offline events. This is only a hint for UI copy and whether to
 * attempt an immediate fetch — never the sole source of truth. Fetches still
 * handle failure independently, since navigator.onLine can be wrong.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const update = () => {
      setIsOffline(typeof navigator !== 'undefined' && navigator.onLine === false)
    }
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return { isOffline }
}
