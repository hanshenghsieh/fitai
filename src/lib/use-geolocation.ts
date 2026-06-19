'use client'

import { useEffect, useState } from 'react'
import { TAIPEI_DEFAULT_LOCATION } from './nearby-engine'

export type LocationSource = 'gps' | 'work' | 'fallback'

export interface UserCoords {
  lat: number
  lng: number
  label: string
  source: LocationSource
}

export function useGeolocation(workLocation?: { lat: number; lng: number; label?: string } | null) {
  const [coords, setCoords] = useState<UserCoords | null>(null)

  useEffect(() => {
    if (workLocation?.lat != null && workLocation?.lng != null) {
      setCoords({
        lat: workLocation.lat,
        lng: workLocation.lng,
        label: workLocation.label ?? '公司附近',
        source: 'work',
      })
      return
    }
    if (!navigator.geolocation) {
      setCoords({
        ...TAIPEI_DEFAULT_LOCATION,
        label: '參考位置（未開定位）',
        source: 'fallback',
      })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: '你的位置 3 公里內',
          source: 'gps',
        })
      },
      () => {
        setCoords({
          ...TAIPEI_DEFAULT_LOCATION,
          label: '參考位置（定位未開啟）',
          source: 'fallback',
        })
      },
      { timeout: 8000, maximumAge: 600000 }
    )
  }, [workLocation?.lat, workLocation?.lng, workLocation?.label])

  return coords
}
