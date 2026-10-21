'use client'

import { useMemo, useState } from 'react'
import { Map, Play, Square, Trash2, Circle, Satellite, Route, ChevronDown, Bike, AlertTriangle, LocateFixed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatDuration, formatKm, formatKm1 } from '@/lib/status'
import type { AppState, TripDTO, VehicleDTO } from '@/lib/state'
import type { LocationStatus } from '@/lib/use-location'
import { EmptyState } from './ui-bits'
import { LiveTripMap, RouteMap } from './maps'

export interface TrackingState {
  startedAt: number
  distance: number // km
  geoFixes: number
}

function parsePath(json: string | null): [number, number][] {
  if (!json) return []
  try {
    const arr = JSON.parse(json) as [number, number][]
    return Array.isArray(arr) && arr.length >= 2 ? arr : []
  } catch {
    return []
  }
}

export function TripsView({
  state,
  vehicle,
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
  locError,
  onRetryLocation,
}: {
  state: AppState
  vehicle: VehicleDTO
  tracking: TrackingState | null
  autoTrack: boolean
  onToggleAutoTrack: () => void
  onStartTracking: () => void
  onFinishTracking: () => void
  onDeleteTrip: (id: string) => void
  path: [number, number][]
  currentPos: [number, number] | null
  heading: number
  /** 'waiting' = mencari GPS, 'gps' = fix asli, 'sim' = fallback simulasi */
  locMode: 'waiting' | 'gps' | 'sim'
  locStatus: LocationStatus
  locError: string | null
  onRetryLocation: () => void
}) {
  const elapsed = tracking ? Math.floor((Date.now() - tracking.startedAt) / 1000) : 0
  const avgSpeed =
    tracking && elapsed > 5 ? tracking.distance / (elapsed / 3600) : 0

  const list = useMemo(() => state.trips, [state.trips])
  const simMode = locMode === 'sim'
  const modeLabel =
    locMode === 'gps' ? 'GPS AKTIF' : locMode === 'sim' ? 'MODE SIMULASI' : 'MENCARI GPS…'
  const modeColor =
    locMode === 'gps'
      ? { text: 'text-green-600', ping: 'bg-green-400', dot: 'bg-green-500' }
      : locMode === 'sim'
        ? { text: 'text-amber-600', ping: 'bg-amber-400', dot: 'bg-amber-500' }
        : { text: 'text-sky-600', ping: 'bg-sky-400', dot: 'bg-sky-500' }

  return (
    <div className="pb-6">
      {/* Header */}
      <header className="px-4 pb-3 pt-5">
        <h1 className="text-center text-xl font-bold text-zinc-900">
          Perjalanan {vehicle.name}
        </h1>
      </header>

      {/* Lacak otomatis chip */}
      <div className="flex items-center gap-2 px-4">
        <button
          type="button"
          onClick={onToggleAutoTrack}
          className={cn(
            'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
            autoTrack ? 'bg-sky-100 text-sky-600' : 'bg-zinc-200/70 text-zinc-500'
          )}
        >
          {autoTrack ? (
            <Satellite size={14} />
          ) : (
            <Circle size={10} className="fill-zinc-400 text-zinc-400" />
          )}
          Lacak Otomatis
        </button>
      </div>

      {/* Banner izin lokasi */}
      {(locStatus === 'denied' || locStatus === 'unavailable') && !tracking && (
        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1 text-xs leading-relaxed text-amber-800">
            <p className="font-bold">GPS belum aktif</p>
            <p className="mt-0.5 text-amber-700">
              {locError ?? 'Izinkan akses lokasi agar posisi motor tampil sesuai GPS-mu.'}
            </p>
            <button
              type="button"
              onClick={onRetryLocation}
              className="mt-2 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-amber-950 active:scale-95"
            >
              <LocateFixed size={12} />
              Coba Deteksi Lagi
            </button>
          </div>
        </div>
      )}

      {/* Kartu lacak manual */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <span
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              tracking ? 'animate-pulse bg-green-500' : 'bg-zinc-300'
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-zinc-900">Lacak Manual</p>
            <p className="truncate text-[13px] text-zinc-400">
              {tracking
                ? 'Merekam perjalanan berlangsung…'
                : 'Mulai merekam perjalanan sekarang.'}
            </p>
          </div>
          {tracking ? (
            <button
              type="button"
              onClick={onFinishTracking}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-4 py-2.5 text-[15px] font-bold text-red-500 active:scale-95"
            >
              <Square size={15} className="fill-red-500 text-red-500" />
              Selesai
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartTracking}
              className="flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-4 py-2.5 text-[15px] font-bold text-sky-600 active:scale-95"
            >
              <Play size={15} className="fill-sky-600 text-sky-600" />
              Mulai
            </button>
          )}
        </div>
      </div>

      {/* Peta live + posisi motor real-time */}
      {tracking && (
        <div className="px-4 pt-3">
          <LiveTripMap
            path={path}
            current={currentPos}
            heading={heading}
            simMode={simMode}
            className="h-64 w-full"
          />

          {/* Statistik live */}
          <div className="mt-3 rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-green-100">
            <div className={cn(
              'flex items-center justify-center gap-2 text-xs font-semibold',
              modeColor.text
            )}>
              <span className="relative flex h-2 w-2">
                <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', modeColor.ping)} />
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', modeColor.dot)} />
              </span>
              {modeLabel}
            </div>
            <p className="mt-2 text-5xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {formatKm1(tracking.distance)}
            </p>
            <p className="text-sm font-medium text-zinc-400">kilometer</p>
            <div className="mt-4 flex justify-center gap-8">
              <div>
                <p className="text-lg font-bold text-zinc-800 tabular-nums">
                  {formatDuration(elapsed)}
                </p>
                <p className="text-[11px] text-zinc-400">Durasi</p>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-800 tabular-nums">
                  {formatKm1(avgSpeed)}
                </p>
                <p className="text-[11px] text-zinc-400">km/jam</p>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-800 tabular-nums">
                  {formatKm(vehicle.odometer + tracking.distance)}
                </p>
                <p className="text-[11px] text-zinc-400">Odo (km)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daftar perjalanan */}
      {list.length === 0 && !tracking ? (
        <EmptyState
          icon={Map}
          title="Tidak Ada Perjalanan Tercatat"
          description="Perjalanan ditambahkan dengan mengaktifkan lacak otomatis pada kendaraan atau dengan memindahkan perjalanan dari kendaraan lain."
        />
      ) : (
        <div className="space-y-3 px-4 pt-5">
          {list.map((t) => (
            <TripItem key={t.id} t={t} onDelete={() => onDeleteTrip(t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TripItem({ t, onDelete }: { t: TripDTO; onDelete: () => void }) {
  const [openRoute, setOpenRoute] = useState(false)
  const path = useMemo(() => parsePath(t.path), [t.path])
  const avg = t.duration > 60 ? t.distance / (t.duration / 3600) : 0

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50">
          <Map size={16} className="text-sky-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-800">
            {formatDate(t.startedAt)}
          </p>
          <p className="text-[11px] text-zinc-400">
            {t.source === 'auto' ? 'Lacak Otomatis' : 'Lacak Manual'} ·{' '}
            {formatDuration(t.duration)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Hapus perjalanan"
          className="text-zinc-300 transition-colors hover:text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-zinc-100 pt-3">
        <p className="tabular-nums">
          <span className="text-2xl font-bold text-zinc-900">
            {formatKm1(t.distance)}
          </span>
          <span className="text-sm font-medium text-zinc-400"> km</span>
        </p>
        <p className="text-xs text-zinc-400 tabular-nums">
          {avg > 0 ? `${formatKm1(avg)} km/jam` : '—'} · {formatKm(t.startOdo)} →{' '}
          {formatKm(t.endOdo)} km
        </p>
      </div>
      {path.length >= 2 && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setOpenRoute((o) => !o)}
            className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600 active:scale-95"
          >
            <Route size={13} />
            {openRoute ? 'Sembunyikan Rute' : 'Lihat Rute di Peta'}
            <ChevronDown
              size={13}
              className={cn('transition-transform', openRoute && 'rotate-180')}
            />
          </button>
          {openRoute && (
            <div className="relative mt-2.5">
              <RouteMap path={path} className="h-48 w-full" />
              <span className="absolute left-3 top-3 z-[500] flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-zinc-600 shadow">
                <Bike size={11} className="text-sky-600" />
                {path.length} titik GPS
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
