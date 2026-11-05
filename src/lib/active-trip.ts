'use client'

/**
 * Persistensi perjalanan yang sedang berjalan ke localStorage.
 * Bila browser/ponsel mematikan halaman di tengah rekaman (layar mati,
 * memory pressure, tab ditutup), progres jarak & rute TIDAK hilang —
 * saat aplikasi dibuka ulang pengguna bisa melanjutkan rekaman tersebut.
 */

const KEY = 'mm-active-trip'

/** Perjalanan lebih tua dari ini dianggap kedaluwarsa (12 jam) */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

/** Sama dengan batas titik rute saat rekam — simpan tidak lebih besar */
const MAX_PATH = 2500

export interface SavedTrip {
  startedAt: number
  distance: number
  path: [number, number][]
  savedAt: number
}

function sanitizePath(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return []
  const pts: [number, number][] = []
  for (const p of raw) {
    if (Array.isArray(p) && p.length >= 2) {
      const lat = Number(p[0])
      const lng = Number(p[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng])
    }
    if (pts.length >= MAX_PATH) break
  }
  return pts
}

export function saveActiveTrip(t: {
  startedAt: number
  distance: number
  path: [number, number][]
}): void {
  if (typeof window === 'undefined') return
  try {
    const data: SavedTrip = {
      startedAt: t.startedAt,
      distance: Math.round(t.distance * 1000) / 1000,
      path: sanitizePath(t.path),
      savedAt: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

/** Baca perjalanan tersimpan; null bila tidak ada / kedaluwarsa / rusak */
export function readActiveTrip(): SavedTrip | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<SavedTrip>
    if (
      typeof p.startedAt !== 'number' ||
      typeof p.distance !== 'number' ||
      typeof p.savedAt !== 'number'
    ) {
      return null
    }
    if (Date.now() - p.savedAt > MAX_AGE_MS || p.savedAt < p.startedAt) return null
    return {
      startedAt: p.startedAt,
      distance: Math.max(0, p.distance),
      path: sanitizePath(p.path),
      savedAt: p.savedAt,
    }
  } catch {
    return null
  }
}

export function clearActiveTrip(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* abaikan */
  }
}
