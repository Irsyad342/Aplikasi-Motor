'use client'

/**
 * RideView — tab "Perjalanan".
 * Hero rekam GPS (CTA atau live), statistik ringkas, grafik aktivitas
 * (7 hari & 6 bulan), dan riwayat perjalanan. Semua angka dihitung dari props.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Bike,
  CalendarDays,
  CircleDollarSign,
  MapPinOff,
  Navigation,
  Play,
  Route,
  Square,
  Trash2,
} from 'lucide-react'
import type { TripDTO, VehicleDTO } from '@/lib/state'
import { formatDate, formatDuration, formatKm1 } from '@/lib/status'
import { cn } from '@/lib/utils'
import { LiveTripMap } from '@/components/ridecheck/maps'
import {
  Btn,
  Card,
  EmptyState,
  IconBtn,
  Pill,
  SectionTitle,
  StatCard,
  LimeBarChart,
  LimeLineChart,
  type ChartPoint,
  type TrackingState,
} from '@/components/rc/ui'

export interface RideViewProps {
  vehicle: VehicleDTO
  trips: TripDTO[]
  tracking: TrackingState | null
  autoTrack: boolean
  onToggleAutoTrack: () => void
  onStartTracking: () => void
  onFinishTracking: () => void
  onDeleteTrip: (id: string) => void
  path: [number, number][]
  currentPos: [number, number] | null
  heading: number
  locMode: 'waiting' | 'gps'
  locStatus: string
  /** Detik sejak mulai rekam tanpa fix GPS — untuk umpan balik tombol panduan */
  locWaitSec: number
  /** Buka popup panduan cara mengaktifkan GPS / izin lokasi */
  onOpenGpsHelp: () => void
  onAddManual: () => void
  onAddExpense: () => void
  onOpenHistory: () => void
}

const DAY_MS = 86_400_000

/** Pembungkus section dengan animasi masuk halus — konsisten dengan halaman lain. */
function Section({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

export function RideView(props: RideViewProps) {
  const {
    vehicle,
    trips,
    tracking,
    autoTrack,
    onToggleAutoTrack,
    onStartTracking,
    onFinishTracking,
    onDeleteTrip,
    path,
    currentPos,
    heading,
    locMode,
    locStatus,
    locWaitSec,
    onOpenGpsHelp,
    onAddManual,
    onAddExpense,
    onOpenHistory,
  } = props

  // ---------- Hidrasi & timer ----------
  // Grafik & jam berjalan hanya dirender setelah mount (hindari mismatch SSR)
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- flag hidrasi sesuai pola proyek
  useEffect(() => setMounted(true), [])

  const [now, setNow] = useState(0)
  const live = tracking !== null
  const startedAt = tracking?.startedAt ?? 0
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [live, startedAt])

  const elapsed = tracking
    ? formatDuration(Math.max(0, (now - tracking.startedAt) / 1000))
    : '00:00'

  // ---------- Statistik ----------
  const stats = useMemo(() => {
    const total = trips.reduce((s, t) => s + t.distance, 0)
    let month = 0
    if (mounted) {
      const ref = new Date()
      const key = ref.getFullYear() * 12 + ref.getMonth()
      for (const t of trips) {
        const d = new Date(t.startedAt)
        if (d.getFullYear() * 12 + d.getMonth() === key) month += t.distance
      }
    }
    return { total, month, count: trips.length, avg: trips.length > 0 ? total / trips.length : 0 }
  }, [trips, mounted])

  // ---------- Grafik: km per hari (7 hari terakhir, termasuk hari kosong) ----------
  const weekly = useMemo<ChartPoint[]>(() => {
    if (!mounted) return []
    const fmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }) // Sen, Sel, …
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sums = new Array<number>(7).fill(0)
    for (const t of trips) {
      const d = new Date(t.startedAt)
      d.setHours(0, 0, 0, 0)
      const idx = 6 - Math.round((today.getTime() - d.getTime()) / DAY_MS)
      if (idx >= 0 && idx < 7) sums[idx] += t.distance
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getTime() - (6 - i) * DAY_MS)
      return { label: fmt.format(d), value: Math.round(sums[i] * 10) / 10 }
    })
  }, [trips, mounted])

  // ---------- Grafik: km per bulan (6 bulan terakhir) ----------
  const monthly = useMemo<ChartPoint[]>(() => {
    if (!mounted) return []
    const fmt = new Intl.DateTimeFormat('id-ID', { month: 'short' }) // Jan, Feb, …
    const ref = new Date()
    const baseKey = ref.getFullYear() * 12 + ref.getMonth()
    const sums = new Array<number>(6).fill(0)
    for (const t of trips) {
      const d = new Date(t.startedAt)
      const idx = 5 - (baseKey - (d.getFullYear() * 12 + d.getMonth()))
      if (idx >= 0 && idx < 6) sums[idx] += t.distance
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ref.getFullYear(), ref.getMonth() - (5 - i), 1)
      return { label: fmt.format(d), value: Math.round(sums[i] * 10) / 10 }
    })
  }, [trips, mounted])

  // ---------- Gaya tombol outline di atas kartu ink ----------
  const outlineOnHero = 'border-white/20 bg-transparent text-hero-foreground hover:bg-white/10'

  return (
    <div className="space-y-6">
      {/* ---------- 1. Hero rekam perjalanan ---------- */}
      <Section>
        {tracking === null ? (
          <Card className="rounded-[28px] bg-hero text-hero-foreground">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-hero-foreground/50">
              <Bike size={13} className="shrink-0" />
              <span className="truncate">
                {vehicle.name}
                {vehicle.plate ? ` · ${vehicle.plate}` : ''}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight">Rekam Perjalanan</h2>
            <p className="mt-1 text-[13px] leading-snug text-hero-foreground/60">
              Rekam rute & jarak otomatis lewat GPS, atau catat manual.
            </p>

            <div className="mt-5 space-y-2.5">
              <Btn variant="lime" full onClick={onStartTracking}>
                <Play size={17} /> Mulai Rekam GPS
              </Btn>
              <Btn variant="outline" full className={outlineOnHero} onClick={onAddManual}>
                Catat Manual
              </Btn>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <button
                type="button"
                role="switch"
                aria-checked={autoTrack}
                onClick={onToggleAutoTrack}
                className={cn(
                  'press inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold leading-none transition-colors',
                  autoTrack ? 'bg-lime text-on-lime' : 'bg-white/10 text-hero-foreground'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    autoTrack ? 'bg-hero' : 'bg-hero-foreground/40'
                  )}
                />
                Lacak Otomatis
              </button>
              <span className="text-[11px] font-semibold text-hero-foreground/50">
                Rekam tanpa buka aplikasi
              </span>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[28px] bg-hero text-hero-foreground">
            <div className="flex items-center justify-between gap-3">
              {locMode === 'gps' ? (
                <Pill tone="lime">GPS Aktif</Pill>
              ) : (
                <Pill tone="gray" className="animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Mencari GPS…
                </Pill>
              )}
              <span className="stat-num text-3xl text-hero-foreground">{elapsed}</span>
            </div>

            <LiveTripMap
              path={path}
              current={currentPos}
              heading={heading}
              className="mt-3 h-56 w-full overflow-hidden rounded-[20px]"
            />

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-hero-foreground/50">
                Jarak
              </p>
              <p className="mt-1 leading-none">
                <span className="stat-num text-4xl text-hero-foreground">
                  {formatKm1(tracking.distance)}
                </span>
                <span className="ml-1.5 text-sm font-bold text-hero-foreground/60">km</span>
              </p>
            </div>

            <Btn variant="danger" full className="mt-4" onClick={onFinishTracking}>
              <Square size={15} /> Selesai & Simpan
            </Btn>

            {locMode === 'waiting' && (
              <div className="mt-3 flex flex-col items-center gap-2 text-center">
                <p className="text-[12px] font-semibold text-hero-foreground/70">
                  Nyalakan GPS &amp; pastikan berada di luar ruangan agar jarak tercatat akurat
                </p>
                {(locStatus === 'denied' || locStatus === 'unavailable' || locWaitSec >= 12) && (
                  <button
                    type="button"
                    onClick={onOpenGpsHelp}
                    className="press mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-warn/15 text-[13px] font-extrabold text-warn ring-1 ring-warn/30 transition-colors hover:bg-warn/25"
                  >
                    <MapPinOff size={16} />
                    {locStatus === 'denied'
                      ? 'Izin lokasi belum diberikan — ketuk untuk panduan'
                      : 'GPS belum terdeteksi — ketuk untuk panduan aktifkan'}
                  </button>
                )}
              </div>
            )}
          </Card>
        )}
      </Section>

      {/* ---------- 2. Statistik ---------- */}
      <Section delay={0.05}>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Route size={15} />}
            label="Total"
            value={formatKm1(stats.total)}
            unit="km"
            className="p-4 [&_.stat-num]:text-lg"
          />
          <StatCard
            icon={<CalendarDays size={15} />}
            label="Bulan Ini"
            value={formatKm1(stats.month)}
            unit="km"
            className="p-4 [&_.stat-num]:text-lg"
          />
          <StatCard
            icon={<Navigation size={15} />}
            label="Trip"
            value={stats.count}
            unit="x"
            className="p-4 [&_.stat-num]:text-lg"
          />
          <StatCard
            icon={<Activity size={15} />}
            label="Rata-rata / Trip"
            value={formatKm1(stats.avg)}
            unit="km"
            className="p-4 [&_.stat-num]:text-lg"
          />
        </div>
      </Section>

      {/* ---------- 3. Grafik ---------- */}
      <Section delay={0.1}>
        <SectionTitle title="Aktivitas" />
        {trips.length === 0 ? (
          <EmptyState
            icon={<Route size={20} />}
            title="Belum ada data perjalanan"
            desc="Rekam perjalanan pertama Anda untuk melihat statistik."
          />
        ) : !mounted ? null : (
          <>
            <Card>
              <p className="text-[12px] font-bold text-muted-foreground">7 Hari Terakhir</p>
              <LimeBarChart data={weekly} unit="km" />
            </Card>
            <Card className="mt-3">
              <p className="text-[12px] font-bold text-muted-foreground">6 Bulan Terakhir</p>
              <LimeLineChart data={monthly} unit="km" />
            </Card>
          </>
        )}
      </Section>

      {/* ---------- 4. Riwayat perjalanan ---------- */}
      <Section delay={0.15}>
        <SectionTitle title="Riwayat Perjalanan" action="Analitik" onAction={onOpenHistory} />
        {trips.length === 0 ? (
          <EmptyState
            icon={<Route size={20} />}
            title="Belum ada perjalanan"
            desc="Riwayat dari rekaman GPS atau catatan manual akan muncul di sini."
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {trips.slice(0, 12).map((t) => (
                <Card key={t.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Route size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {formatDate(t.startedAt)}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold text-muted-foreground">
                      {t.source === 'auto' ? 'GPS Otomatis' : t.duration > 0 ? 'GPS' : 'Manual'} ·{' '}
                      {formatDuration(t.duration)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="stat-num text-base text-foreground">
                      {formatKm1(t.distance)}
                    </span>
                    <span className="ml-1 text-[11px] font-bold text-muted-foreground">km</span>
                  </div>
                  <IconBtn
                    label="Hapus perjalanan"
                    tone="ghost"
                    className="h-9 w-9"
                    onClick={() => {
                      if (window.confirm('Hapus perjalanan ini?')) onDeleteTrip(t.id)
                    }}
                  >
                    <Trash2 size={16} />
                  </IconBtn>
                </Card>
              ))}
              {trips.length > 12 && (
                <p className="px-1 text-[11px] font-semibold text-muted-foreground">
                  Menampilkan 12 dari {trips.length} perjalanan terakhir
                </p>
              )}
            </div>
            <Btn variant="outline" full className="mt-3" onClick={onAddExpense}>
              <CircleDollarSign size={17} /> Catat Pengeluaran
            </Btn>
          </>
        )}
      </Section>
    </div>
  )
}
