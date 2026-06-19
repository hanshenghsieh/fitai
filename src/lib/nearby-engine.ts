import { RESTAURANT_PLACES, haversineM, walkMinutes, googleMapsUrl, type RestaurantPlace } from './restaurant-places'

export interface NearbyPlace extends RestaurantPlace {
  distance_m: number
  walk_minutes: number
  maps_url: string
}

const DEFAULT_RADIUS_M = 3000

export function findNearbyPlaces(
  lat: number,
  lng: number,
  radiusM = DEFAULT_RADIUS_M
): NearbyPlace[] {
  return RESTAURANT_PLACES.map(p => {
    const distance_m = haversineM(lat, lng, p.lat, p.lng)
    return {
      ...p,
      distance_m,
      walk_minutes: walkMinutes(distance_m),
      maps_url: googleMapsUrl(p.lat, p.lng, p.name),
    }
  })
    .filter(p => p.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m)
}

export function nearbyBrands(lat: number, lng: number, radiusM = DEFAULT_RADIUS_M): string[] {
  const places = findNearbyPlaces(lat, lng, radiusM)
  return [...new Set(places.map(p => p.brand))]
}

export function nearestPlaceForBrand(
  lat: number,
  lng: number,
  brand: string,
  radiusM = DEFAULT_RADIUS_M
): NearbyPlace | null {
  return findNearbyPlaces(lat, lng, radiusM).find(p => p.brand === brand) ?? null
}

/** 台北市中心 fallback（未開定位時） */
export const TAIPEI_DEFAULT_LOCATION = { lat: 25.033, lng: 121.5654, label: '台北市中心' }
