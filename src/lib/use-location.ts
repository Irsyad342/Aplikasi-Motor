'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng } from '@/lib/geo'
import { DEFAULT_LOCATION } from '@/lib/geo'

export type LocationStatus =
  | 'idle'
  | 'locating'
  | 'granted'
  | 'denied'
  | 'unavailable'

const CACHE_KEY = 'rc-last-pos'

/** Cache lebih tua dari ini dianggap kedaluwarsa — posisi terlalu lama = tidak akurat */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 jam

interface CachedPos extends LatLng {
  ts: number
}

/**
 * Posisi terakhir yang tersimpan (persist antar kunjungan).
 * null bila belum pernah ada ATAU sudah kedaluwarsa (default 6 jam).
 */
export function readCachedPosition(maxAgeMs: number = CACHE_TTL_MS): CachedPos | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as CachedPos
    if (
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      Math.abs(p.lat) <= 90 &&
      Math.abs(p.lng) <= 180
    ) {
      // cache tanpa timestamp atau terlalu lama tidak dipakai lagi
      if (typeof p.ts !== 'number' || Date.now() - p.ts > maxAgeMs) return null
      return p
    }
    return null
  } catch {
    return null
  }
}

function cachePosition(p: LatLng) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...p, ts: Date.now() }))
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

export interface UseLocationResult {
  /** Posisi terbaik yang tersedia: hasil GPS live, bila belum ada pakai cache */
  pos: LatLng | null
  /** Posisi hasil GPS live pada sesi ini (belum tentu ada) */
  livePos: LatLng | null
  status: LocationStatus
  /** Akurasi dalam meter */
  accuracy: number | null
  /** Pesan error ramah-pengguna bila gagal */
  error: string | null
  /** Coba deteksi ulang (mis. setelah pengguna memberi izin) */
  refresh: () => void
}

/**
 * Hook lokasi GPS yang sebenarnya — TIDAK diam-diam memakai fallback Jakarta.
 * - Saat mount: ambil cache + langsung getCurrentPosition high-accuracy.
 * - Jika izin ditolak -> status 'denied' (pos tetap dari cache bila ada).
 * - refresh() untuk mencoba lagi.
 */
export function useLocation(): UseLocationResult {
  const [livePos, setLivePos] = useState<LatLng | null>(null)
  const [status, setStatus] = useState<LocationStatus>('locating')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cache, setCache] = useState<LatLng | null>(null)
  const attemptRef = useRef(0)
  const lowAccRef = useRef(false)

  const request = useCallback(() => {
    attemptRef.current += 1
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      setError('Perangkat tidak mendukung GPS')
      return
    }
    setStatus((s) => (s === 'granted' ? s : 'locating'))
    setError(null)
    const onSuccess = (p: GeolocationPosition) => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude }
      if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return
      setLivePos(next)
      setAccuracy(p.coords.accuracy ?? null)
      setStatus('granted')
      setError(null)
      cachePosition(next)
    }
    const onFail = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setStatus('denied')
        setError('Izin lokasi belum diberikan — aktifkan akses lokasi di browser')
        return
      }
      // GPS presisi tinggi timeout -> coba sekali lagi via lokasi jaringan (coarse)
      if (err.code === err.TIMEOUT && !lowAccRef.current) {
        lowAccRef.current = true
        navigator.geolocation.getCurrentPosition(onSuccess, onFail, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 30000,
        })
        return
      }
      setStatus('unavailable')
      setError('GPS tidak tersedia saat ini — coba lagi di area terbuka')
    }
    lowAccRef.current = false
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onFail,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    )
  }, [])

  useEffect(() => {
    const cached = readCachedPosition()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi cache localStorage saat mount
    if (cached) setCache({ lat: cached.lat, lng: cached.lng })
    request()
  }, [request])

  const pos = livePos ?? cache

  const refresh = useCallback(() => {
    request()
  }, [request])

  return { pos, livePos, status, accuracy, error, refresh }
}

/**
 * Posisi fallback terakhir: cache GPS -> default Jakarta.
 * Hanya dipakai untuk memusatkan peta, bukan untuk mengklaim "lokasimu".
 */
export function fallbackPosition(pos: LatLng | null): LatLng {
  return pos ?? DEFAULT_LOCATION
}
