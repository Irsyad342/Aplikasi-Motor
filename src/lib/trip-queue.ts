'use client'

/**
 * Antrean perjalanan offline — jaringan tidak stabil tidak boleh membuat
 * data perjalanan hilang.
 *
 * Alur: setiap perjalanan hasil rekam GPS MASUK ANTREAN LOKAL lebih dulu
 * (localStorage, instan & tanpa internet), lalu dikirim ke server di latar
 * belakang. Kirim ulang otomatis saat koneksi kembali. Setiap trip punya
 * `clientRef` unik — server mengenali trip yang sudah masuk sehingga
 * pengiriman ulang TIDAK membuat duplikat.
 */

const KEY = 'mm-trip-queue'

export interface PendingTrip {
  /** ID unik dari klien — kunci idempotensi anti-duplikat */
  clientRef: string
  /** Pemilik trip — antrean tidak akan terkirim ke akun lain */
  userId: string
  vehicleId: string
  distance: number
  duration: number
  movingSec: number
  source: 'auto' | 'manual'
  path: string | null
  startedAt: string
  endedAt: string
  queuedAt: number
}

function makeRef(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    /* fallthrough */
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeQueue(raw: unknown): PendingTrip[] {
  if (!Array.isArray(raw)) return []
  const out: PendingTrip[] = []
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue
    const t = it as Partial<PendingTrip>
    if (
      typeof t.clientRef !== 'string' ||
      typeof t.vehicleId !== 'string' ||
      typeof t.userId !== 'string' ||
      typeof t.distance !== 'number' ||
      typeof t.duration !== 'number' ||
      typeof t.startedAt !== 'string' ||
      typeof t.endedAt !== 'string'
    ) {
      continue
    }
    out.push({
      clientRef: t.clientRef,
      userId: t.userId,
      vehicleId: t.vehicleId,
      distance: Math.max(0, t.distance),
      duration: Math.max(0, Math.round(t.duration)),
      movingSec: Math.max(0, Math.round(t.movingSec ?? 0)),
      source: t.source === 'auto' ? 'auto' : 'manual',
      path: typeof t.path === 'string' ? t.path : null,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      queuedAt: typeof t.queuedAt === 'number' ? t.queuedAt : Date.now(),
    })
  }
  return out
}

function readQueue(): PendingTrip[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return sanitizeQueue(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeQueue(q: PendingTrip[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(q))
  } catch {
    /* penyimpanan penuh — antrean terakhir dibatalkan, trip asli tetap aman di server */
  }
}

/** Jumlah trip yang menunggu sinkronisasi */
export function queueSize(): number {
  return readQueue().length
}

/**
 * Masukkan perjalanan ke antrean — dipanggil SEBELUM percobaan kirim agar
 * data sudah aman di perangkat apa pun yang terjadi pada jaringan.
 *
 * `sessionStartedAt` (opsional) = kapan sesi rekam dimulai. Trip dengan sesi
 * yang sama hanya masuk SEKALI — tekanan tombol Selesai berkali-kali atau
 * permintaan yang saling menabrak tidak pernah menghasilkan data duplikat.
 * Return clientRef trip, atau null bila trip dilewati karena duplikat.
 */
export function enqueueTrip(
  t: Omit<PendingTrip, 'clientRef' | 'queuedAt'>,
  sessionStartedAt?: number
): string | null {
  const q = readQueue()
  if (typeof sessionStartedAt === 'number') {
    const dup = q.some((it) => {
      const sameSession =
        it.vehicleId === t.vehicleId && new Date(it.startedAt).getTime() === sessionStartedAt
      // Trip yang sama juga dikenali selama masih "baru" (5 menit) —
      // melindungi dari re-entry di tick yang sama dengan waktu berbeda
      const fresh = Date.now() - it.queuedAt < 5 * 60 * 1000
      return sameSession || (fresh && it.distance === t.distance && it.startedAt === t.startedAt)
    })
    if (dup) return null
  }
  const ref = makeRef()
  q.push({ ...t, clientRef: ref, queuedAt: Date.now() })
  writeQueue(q)
  return ref
}

function removeFromQueue(ref: string): void {
  writeQueue(readQueue().filter((t) => t.clientRef !== ref))
}

/** POST dengan batas waktu — jaringan menggantung tidak boleh menggantung UI */
async function postTrip(t: PendingTrip): Promise<{ ok: boolean; status: number }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientRef: t.clientRef,
        vehicleId: t.vehicleId,
        distance: t.distance,
        duration: t.duration,
        movingSec: t.movingSec,
        source: t.source,
        path: t.path,
        startedAt: t.startedAt,
        endedAt: t.endedAt,
      }),
      signal: ctrl.signal,
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 } // 0 = jaringan putus / timeout
  } finally {
    clearTimeout(timer)
  }
}

export interface SyncResult {
  /** Trip yang berhasil masuk server pada giliran ini */
  synced: number
  /** Trip yang masih menunggu (gagal sementara / offline) */
  pending: number
}

let syncing = false

/**
 * Kirim seluruh trip milik `userId` yang masih di antrean.
 * - 200/201            → berhasil, keluarkan dari antrean
 * - 400/404/422        → gagal permanen (data ditolak server) → buang agar
 *                        antrean tidak macet selamanya
 * - 401                → sesi berakhir → hentikan, coba lagi setelah login
 * - 429                → terlalu sering → hentikan, coba lagi nanti
 * - 0 / 5xx            → jaringan / server bermasalah → hentikan, coba lagi nanti
 *
 * Hanya trip milik `userId` yang dikirim — antrean tidak pernah menuangkan
 * data pengguna A ke akun pengguna B.
 */
export async function syncTrips(userId: string): Promise<SyncResult> {
  if (!userId || syncing) return { synced: 0, pending: queueSize() }
  syncing = true
  try {
    const queue = readQueue().filter((t) => t.userId === userId)
    let synced = 0
    for (const t of queue) {
      const { ok, status } = await postTrip(t)
      if (ok) {
        removeFromQueue(t.clientRef)
        synced += 1
        continue
      }
      if (status === 400 || status === 404 || status === 422) {
        // Ditolak permanen (kendaraan tidak ada / bukan milik akun) —
        // simpan salinan terakhir di console agar bisa ditelusuri, lalu buang.
        console.warn('Trip dibuang dari antrean (ditolak server):', t.clientRef, status)
        removeFromQueue(t.clientRef)
        continue
      }
      // 401 (belum login), 429 (rate limit), 0/5xx (jaringan) — berhenti,
      // sisanya tetap di antrean untuk percobaan berikutnya.
      break
    }
    return { synced, pending: queueSize() }
  } finally {
    syncing = false
  }
}
