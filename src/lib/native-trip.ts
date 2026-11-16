'use client'

/**
 * native-trip.ts — jembatan web ↔ plugin native Android `RideTracking`.
 *
 * Aplikasi Android MotoMate (folder /android, dibangun lewat Capacitor)
 * memuat UI web dari server dan menyuntikkan bridge Capacitor. Bila bridge
 * tersedia, perekaman perjalanan memakai Foreground Service native GPS
 * sehingga TETAP BERJALAN saat layar terkunci.
 *
 * Di browser biasa (isNativeApp() === false) SEMUA fungsi membalik dengan
 * null/false — UI web memakai Geolocation API dengan batasan yang diberitahu
 * secara jujur: browser TIDAK bisa merekam di latar belakang saat layar mati.
 */

export interface NativeStatus {
  active: boolean
  serviceActive: boolean
  /** Sesi "recording" di SQLite tapi service mati (dihentikan sistem) */
  orphanSession: boolean
  pendingSync?: number
  clientRef?: string
  vehicleId?: string
  startedAt?: number
  distanceKm?: number
  movingSec?: number
  fixes?: number
  state?: string
}

export interface NativeStartResult {
  started: boolean
  reason?: 'permission' | 'gps_off' | 'already_active'
  clientRef?: string
  startedAt?: number
  distanceKm?: number
}

export interface TripUpdate {
  distanceKm: number
  durationSec: number
  movingSec: number
  fixes: number
}

export interface TripFinished {
  saved: boolean
  synced: boolean
  distanceKm: number
  durationSec: number
  movingSec: number
  clientRef: string
  pendingSync: number
}

interface RideTrackingPluginShape {
  getStatus(): Promise<NativeStatus>
  start(o: { vehicleId: string; source?: string; userId?: string }): Promise<NativeStartResult>
  resume(): Promise<{ resumed: boolean; reason?: string; already?: boolean }>
  finish(): Promise<{ stopped: boolean; alreadyStopped?: boolean; saved?: boolean }>
  discard(): Promise<{ discarded: boolean }>
  checkPermissions(): Promise<{ location: string; notifications: string }>
  requestPermissions(): Promise<{ location: string; notifications: string }>
  addListener(event: string, cb: (data: unknown) => void): Promise<{ remove: () => void }>
}

/** Apakah UI berjalan di dalam WebView aplikasi Android? */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean }
      }
    ).Capacitor
    return Boolean(cap?.isNativePlatform?.())
  } catch {
    return false
  }
}

/** Ambil plugin native; null di browser biasa. */
function getPlugin(): RideTrackingPluginShape | null {
  if (!isNativeApp()) return null
  try {
    const cap = (
      window as unknown as {
        Capacitor?: {
          Plugins?: Record<string, RideTrackingPluginShape | undefined>
        }
      }
    ).Capacitor
    return cap?.Plugins?.RideTracking ?? null
  } catch {
    return null
  }
}

/** Status sesi native (null di browser / plugin tidak tersedia). */
export async function nativeGetStatus(): Promise<NativeStatus | null> {
  try {
    return (await getPlugin()?.getStatus()) ?? null
  } catch {
    return null
  }
}

/** Mulai sesi native; null di browser. */
export async function nativeStart(opts: {
  vehicleId: string
  userId?: string
  source: 'auto' | 'manual'
}): Promise<NativeStartResult | null> {
  try {
    return (await getPlugin()?.start(opts)) ?? null
  } catch (e) {
    return { started: false, reason: 'permission' }
  }
}

/** Lanjutkan sesi yatim (service berhenti tak terduga); null di browser. */
export async function nativeResume(): Promise<{ resumed: boolean; reason?: string } | null> {
  try {
    return (await getPlugin()?.resume()) ?? null
  } catch {
    return null
  }
}

/** Selesai sesi native (finalisasi + sinkron di latar belakang). */
export async function nativeFinish(): Promise<
  { stopped: boolean; alreadyStopped?: boolean; saved?: boolean } | null
> {
  try {
    return (await getPlugin()?.finish()) ?? null
  } catch {
    return null
  }
}

/** Buang sesi tanpa menyimpan. */
export async function nativeDiscard(): Promise<boolean> {
  try {
    const r = await getPlugin()?.discard()
    return Boolean(r?.discarded)
  } catch {
    return false
  }
}

export async function nativeRequestPermissions(): Promise<{
  location: string
  notifications: string
} | null> {
  try {
    return (await getPlugin()?.requestPermissions()) ?? null
  } catch {
    return null
  }
}

/**
 * Berlangganan event live dari service.
 * Return fungsi unsubscribe. Di browser: no-op (unsubscribe kosong).
 */
export async function onNativeTripUpdate(
  cb: (u: TripUpdate) => void
): Promise<() => void> {
  const p = getPlugin()
  if (!p) return () => {}
  try {
    const handle = await p.addListener('onTripUpdate', (data) => {
      const d = data as TripUpdate
      if (d && typeof d.distanceKm === 'number') cb(d)
    })
    return handle?.remove ?? (() => {})
  } catch {
    return () => {}
  }
}

export async function onNativeTripFinished(
  cb: (f: TripFinished) => void
): Promise<() => void> {
  const p = getPlugin()
  if (!p) return () => {}
  try {
    const handle = await p.addListener('onTripFinished', (data) => {
      const d = data as TripFinished
      if (d && typeof d.saved === 'boolean') cb(d)
    })
    return handle?.remove ?? (() => {})
  } catch {
    return () => {}
  }
}
