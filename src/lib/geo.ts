export interface LatLng {
  lat: number
  lng: number
}

export const DEFAULT_LOCATION: LatLng = {
  lat: -6.1754, // Monas, Jakarta Pusat
  lng: 106.8272,
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Hitung bearing (arah hadap) dari titik a ke b dalam derajat 0-360 */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng))
  const br = (Math.atan2(y, x) * 180) / Math.PI
  return (br + 360) % 360
}

/** Format jarak: < 1 km -> meter, else km dengan 1 desimal */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 1000 / 10) * 10)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}
