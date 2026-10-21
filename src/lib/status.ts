// Utilitas status & format komponen (dipakai di server & client)

export type ComponentStatus = 'ganti' | 'segera' | 'sehat'

export interface StatusInput {
  intervalKm: number
  intervalDays: number
  lastServiceOdo: number
  lastServiceDate: string | Date
}

export interface ComponentHealth {
  status: ComponentStatus
  kmRemaining: number
  kmPct: number // 0..1 sisa pakai berdasarkan km
  daysRemaining: number
  timePct: number // 0..1 sisa berdasarkan waktu
  estDate: Date
  worstPct: number
}

const DAY_MS = 86_400_000

export function computeHealth(
  c: StatusInput,
  odometer: number,
  now: Date = new Date()
): ComponentHealth {
  const lastDate = new Date(c.lastServiceDate)

  let kmRemaining: number
  let kmPct: number
  if (c.intervalKm > 0) {
    const used = Math.max(0, odometer - c.lastServiceOdo)
    kmRemaining = Math.max(0, c.intervalKm - used)
    kmPct = kmRemaining / c.intervalKm
  } else {
    kmRemaining = Infinity
    kmPct = 1
  }

  const estDate = new Date(lastDate.getTime() + c.intervalDays * DAY_MS)
  const daysRemaining = Math.ceil((estDate.getTime() - now.getTime()) / DAY_MS)
  const timePct = daysRemaining / c.intervalDays

  const expired = (c.intervalKm > 0 && kmRemaining <= 0) || daysRemaining <= 0
  const worstPct = Math.min(c.intervalKm > 0 ? kmPct : 1, timePct)

  let status: ComponentStatus
  if (expired || worstPct <= 0.1) status = 'ganti'
  else if (worstPct < 0.25) status = 'segera'
  else status = 'sehat'

  return {
    status,
    kmRemaining: c.intervalKm > 0 ? kmRemaining : 0,
    kmPct,
    daysRemaining,
    timePct,
    estDate,
    worstPct,
  }
}

export function statusLabel(s: ComponentStatus): string {
  if (s === 'ganti') return 'Perlu diganti'
  if (s === 'segera') return 'Periksa Segera'
  return 'Sehat'
}

export function statusOrder(s: ComponentStatus): number {
  if (s === 'ganti') return 0
  if (s === 'segera') return 1
  return 2
}

// ---------- Formatters (id-ID) ----------

export function formatKm(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
}

export function formatKm1(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n)
}

const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export function formatMonthYear(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`
}

export function formatPct(p: number): string {
  return `${Math.max(0, Math.min(100, Math.round(p * 100)))}%`
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const pad = (v: number) => String(v).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
