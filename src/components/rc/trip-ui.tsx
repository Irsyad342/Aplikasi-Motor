'use client'

/**
 * Trip UI — komponen bersama daftar perjalanan:
 * - parseTripPath   : ubah JSON path tersimpan jadi koordinat valid
 * - RouteThumb      : gambaran rute GPS (SVG mini) dari titik awal ke tujuan
 * - TripCard        : kartu riwayat perjalanan (rute, jam mulai→selesai, km)
 * - TripDetailSheet : detail lengkap dengan peta Leaflet + aksi edit/hapus
 */

import { useMemo, type ReactNode } from 'react'
import { ArrowRight, Route } from 'lucide-react'
import type { TripDTO } from '@/lib/state'
import { formatDate, formatDuration, formatKm1, formatTime, tripAvgSpeedKmh } from '@/lib/status'
import { Btn, Card, Sheet } from '@/components/rc/ui'
import { RouteMap } from '@/components/ridecheck/maps'
import { Pencil, Trash2 } from 'lucide-react'

const MAX_POINTS = 2500

/** JSON path tersimpan → daftar [lat,lng] valid (aman terhadap data rusak) */
export function parseTripPath(path: string | null): [number, number][] {
  if (!path) return []
  try {
    const arr = JSON.parse(path) as unknown
    if (!Array.isArray(arr)) return []
    const pts: [number, number][] = []
    for (const p of arr) {
      if (Array.isArray(p) && p.length >= 2) {
        const lat = Number(p[0])
        const lng = Number(p[1])
        if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng])
      }
      if (pts.length >= MAX_POINTS) break
    }
    return pts
  } catch {
    return []
  }
}

/** Label sumber perjalanan yang ramah dibaca */
export function tripSourceLabel(t: TripDTO): string {
  if (t.source === 'auto') return 'GPS Otomatis'
  return t.duration > 0 ? 'GPS' : 'Manual'
}

// ---------- Gambaran rute (SVG) ----------

/**
 * Mini peta rute: garis jalur GPS dari titik awal (hijau lime) ke tujuan (merah).
 * Proyeksi equirectangular sederhana dinormalisasi ke kotak gambar — ringan,
 * tanpa peta eksternal, cocok untuk thumbnail daftar.
 */
export function RouteThumb({
  path,
  className,
}: {
  path: [number, number][]
  className?: string
}) {
  const projected = useMemo(() => {
    if (path.length < 2) return null
    const midLat = (path[0][0] + path[path.length - 1][0]) / 2
    const cos = Math.max(0.2, Math.cos((midLat * Math.PI) / 180))
    // proyeksi: x = lng·cos(lat), y = -lat (utara ke atas)
    const xs = path.map((p) => p[1] * cos)
    const ys = path.map((p) => -p[0])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const w = maxX - minX
    const h = maxY - minY
    // rute nyaris satu titik → tidak ada bentuk berarti
    if (w < 1e-9 && h < 1e-9) return null
    const PAD = 12
    const scale = (100 - PAD * 2) / Math.max(w, h, 1e-9)
    const offX = (100 - PAD * 2 - w * scale) / 2 + PAD
    const offY = (100 - PAD * 2 - h * scale) / 2 + PAD
    return path.map((p, i) => ({
      x: (xs[i] - minX) * scale + offX,
      y: (ys[i] - minY) * scale + offY,
    }))
  }, [path])

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[18px] border border-border/60 bg-muted/60 ${className ?? ''}`}
      aria-hidden="true"
    >
      {/* pola titik halus seperti peta */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
      />
      {projected ? (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          <polyline
            points={projected.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={projected[0].x}
            cy={projected[0].y}
            r="4"
            fill="var(--chart-1)"
            stroke="var(--card)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={projected[projected.length - 1].x}
            cy={projected[projected.length - 1].y}
            r="4"
            fill="var(--danger)"
            stroke="var(--card)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
          <Route size={18} />
        </div>
      )}
    </div>
  )
}

// ---------- Kartu perjalanan ----------

export function TripCard({
  trip,
  onClick,
  action,
}: {
  trip: TripDTO
  onClick: () => void
  /** Slot opsional di bawah (mis. catatan) */
  action?: ReactNode
}) {
  const path = useMemo(() => parseTripPath(trip.path), [trip.path])
  const avg = tripAvgSpeedKmh(trip)
  return (
    <Card padded={false} className="p-0" onClick={onClick}>
      <div className="flex items-stretch gap-3 p-3.5">
        <RouteThumb path={path} className="h-auto min-h-[64px] w-[104px]" />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-sm font-extrabold text-foreground">
            {formatDate(trip.startedAt)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
            {formatTime(trip.startedAt)}
            <ArrowRight size={11} className="shrink-0" />
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
            {formatTime(trip.endedAt)}
          </p>
          <p className="mt-1 truncate text-[11px] font-bold text-muted-foreground">
            {tripSourceLabel(trip)} · {formatDuration(trip.duration)}
            {avg >= 1 && avg < 150 ? ` · ${formatKm1(avg)} km/j` : ''}
          </p>
          {action}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center pr-0.5">
          <span className="stat-num text-lg leading-none text-foreground">
            {formatKm1(trip.distance)}
          </span>
          <span className="mt-1 text-[10px] font-bold text-muted-foreground">km</span>
        </div>
      </div>
    </Card>
  )
}

// ---------- Detail perjalanan ----------

function StatBox({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 leading-none">
        <span className="stat-num text-[17px] text-foreground">{value}</span>
        {unit && <span className="ml-1 text-[11px] font-bold text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}

export function TripDetailSheet({
  open,
  trip,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean
  trip: TripDTO | null
  onClose: () => void
  onEdit: (t: TripDTO) => void
  onDelete: (t: TripDTO) => void
}) {
  const path = useMemo(() => parseTripPath(trip?.path ?? null), [trip])
  if (!trip) return null
  const avg = tripAvgSpeedKmh(trip)
  const hasRoute = path.length >= 2
  return (
    <Sheet open={open} onClose={onClose} title="Detail Perjalanan">
      <div className="flex flex-col gap-4">
        {hasRoute ? (
          <RouteMap path={path} className="h-60 w-full" />
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/50 text-muted-foreground">
            <Route size={22} />
            <p className="px-6 text-center text-[12px] font-semibold leading-snug">
              Rute GPS tidak terekam untuk perjalanan ini
            </p>
          </div>
        )}

        {/* Rute: dari mana ke mana */}
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-lime" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Titik Awal
              </p>
              <p className="text-[13px] font-extrabold text-foreground">
                {formatTime(trip.startedAt)}
              </p>
            </div>
            <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Tujuan
              </p>
              <p className="text-[13px] font-extrabold text-foreground">
                {formatTime(trip.endedAt)}
              </p>
            </div>
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-danger" />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
            {formatDate(trip.startedAt)}
            {hasRoute ? ` · ${path.length} titik GPS terekam` : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Jarak" value={formatKm1(trip.distance)} unit="km" />
          <StatBox label="Durasi" value={formatDuration(trip.duration)} />
          <StatBox
            label="Rata-rata"
            value={avg >= 1 && avg < 150 ? formatKm1(avg) : '0'}
            unit="km/j"
          />
          <StatBox label="Sumber" value={tripSourceLabel(trip)} />
        </div>

        {trip.endOdo > trip.startOdo && (
          <p className="text-center text-[11px] font-semibold text-muted-foreground">
            Odometer {trip.startOdo.toLocaleString('id-ID')} →{' '}
            {trip.endOdo.toLocaleString('id-ID')} km
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Btn
            variant="outline"
            full
            onClick={() => {
              onClose()
              onEdit(trip)
            }}
          >
            <Pencil size={15} /> Edit
          </Btn>
          <Btn
            variant="danger"
            full
            onClick={() => {
              onClose()
              onDelete(trip)
            }}
          >
            <Trash2 size={15} /> Hapus
          </Btn>
        </div>
      </div>
    </Sheet>
  )
}
