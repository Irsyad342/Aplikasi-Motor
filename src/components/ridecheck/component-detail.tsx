'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Wrench,
  Trash2,
  Plus,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  formatDate,
  formatKm,
  formatMonthYear,
  formatPct,
  statusLabel,
  type ComponentStatus,
} from '@/lib/status'
import type { ComponentDTO, RecordDTO, VehicleDTO } from '@/lib/state'
import { ComponentIcon } from './icons'

/** Segmented control dengan design token — aktif lime. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-full bg-muted p-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              'flex-1 rounded-full py-2 text-sm transition-all',
              active ? 'bg-lime font-bold text-on-lime shadow-sm' : 'font-semibold text-muted-foreground'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const STATUS_RANGE: Record<ComponentStatus, string> = {
  ganti: 'var(--danger)',
  segera: 'var(--warn)',
  sehat: 'var(--ok)',
}

export function ComponentDetail({
  component,
  records,
  vehicle,
  onBack,
  onPatch,
  onOpenService,
  onRemove,
}: {
  component: ComponentDTO
  records: RecordDTO[]
  vehicle: VehicleDTO
  onBack: () => void
  onPatch: (data: Record<string, unknown>) => Promise<void>
  onOpenService: () => void
  onRemove: () => void
}) {
  const [tab, setTab] = useState<'saat-ini' | 'riwayat'>('saat-ini')
  const [showAdjust, setShowAdjust] = useState(true)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Nilai lokal hanya dipakai saat pengguna berinteraksi; null = ikut nilai server
  const [kmInput, setKmInput] = useState(String(component.intervalKm))
  const [dayInput, setDayInput] = useState(String(Math.round(component.intervalDays / 30)))
  const [kmSliderLocal, setKmSliderLocal] = useState<number | null>(null)
  const [daySliderLocal, setDaySliderLocal] = useState<number | null>(null)

  const health = component.health
  const kmSlider = kmSliderLocal ?? health?.kmRemaining ?? 0
  const daySlider = daySliderLocal ?? Math.max(0, health?.daysRemaining ?? 0)
  const status = health?.status ?? 'sehat'
  const rangeColor = STATUS_RANGE[status]

  const componentRecords = useMemo(
    () => records.filter((r) => r.componentId === component.id),
    [records, component.id]
  )

  const kmPctLive = component.intervalKm > 0 ? kmSlider / component.intervalKm : 1
  const dayPctLive = component.intervalDays > 0 ? daySlider / component.intervalDays : 1

  const estDateStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + Math.round(daySlider))
    return d
  }, [daySlider])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-center bg-background"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
    >
      <div className="flex h-full w-full max-w-[520px] flex-col sm:border-x sm:border-border/70">
        {/* Top bar */}
        <div className="px-3 pb-1 pt-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali"
            className="press flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm active:bg-muted"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-4 px-4 pt-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
            <ComponentIcon icon={component.icon} size={40} className="text-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-bold leading-tight text-foreground">
              {component.name}
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Servis Terakhir:{' '}
              <span className="font-semibold text-foreground">
                {component.hasService ? formatDate(component.lastServiceDate) : 'Tidak tersedia'}
              </span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'saat-ini', label: 'Saat Ini' },
              { value: 'riwayat', label: 'Riwayat' },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-36 pt-4">
          {tab === 'saat-ini' ? (
            <div className="space-y-4">
              <div className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm">
                {/* Interval Servis */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="whitespace-nowrap text-lg font-bold text-foreground">Interval Servis</h2>
                    <p className="whitespace-nowrap text-[13px] text-muted-foreground">
                      Direkomendasikan: {formatKm(component.recommendedKm)} km
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={kmInput}
                      onChange={(e) => setKmInput(e.target.value)}
                      onBlur={() => {
                        const v = Math.max(0, Math.round(Number(kmInput) || 0))
                        setKmInput(String(v))
                        if (v !== component.intervalKm) void onPatch({ intervalKm: v })
                      }}
                      className="w-24 rounded-full bg-muted px-2 py-2 text-center text-lg font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Interval servis dalam km"
                    />
                    <span className="text-base font-semibold text-muted-foreground">km</span>
                  </div>
                </div>

                {/* Sisa penggunaan */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[15px] font-semibold text-muted-foreground">
                    Sisa Penggunaan:{' '}
                    <span className="text-xl font-bold text-foreground">
                      {formatKm(kmSlider)} km
                    </span>
                  </p>
                  <span className="text-lg font-bold text-foreground">{formatPct(kmPctLive)}</span>
                </div>

                {showAdjust && (
                  <>
                    <div className="my-4 h-px bg-border" />
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      Sesuaikan sisa penggunaan agar cocok dengan kondisi komponen Anda.
                    </p>
                    <Slider
                      className="mt-4 accent-[#DFFF00] [&_[data-slot=slider-range]]:bg-[var(--range-c)] [&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:w-6 [&_[data-slot=slider-thumb]]:border-[3px] [&_[data-slot=slider-thumb]]:border-card [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-muted"
                      style={{ '--range-c': kmPctLive <= 0.1 ? 'var(--danger)' : kmPctLive < 0.25 ? 'var(--warn)' : rangeColor } as React.CSSProperties}
                      value={[Math.min(kmSlider, component.intervalKm)]}
                      min={0}
                      max={Math.max(component.intervalKm, 1)}
                      step={Math.max(1, Math.round(component.intervalKm / 200))}
                      onValueChange={(v) => setKmSliderLocal(v[0])}
                      onValueCommit={async (v) => {
                        await onPatch({ setRemainingKm: v[0] })
                        setKmSliderLocal(null)
                      }}
                      aria-label="Sesuaikan sisa penggunaan km"
                    />
                  </>
                )}

                <div className="my-5 h-px bg-border" />

                {/* Interval Waktu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="whitespace-nowrap text-lg font-bold text-foreground">Interval Waktu</h2>
                    <p className="whitespace-nowrap text-[13px] text-muted-foreground">
                      Direkomendasikan: {Math.round(component.recommendedDays / 30)} bulan
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={dayInput}
                      onChange={(e) => setDayInput(e.target.value)}
                      onBlur={() => {
                        const months = Math.max(1, Math.round(Number(dayInput) || 1))
                        setDayInput(String(months))
                        const days = months * 30
                        if (days !== component.intervalDays) void onPatch({ intervalDays: days })
                      }}
                      className="w-20 rounded-full bg-muted px-2 py-2 text-center text-lg font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Interval waktu dalam bulan"
                    />
                    <span className="text-base font-semibold text-muted-foreground">bln</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-muted-foreground">
                    <Calendar size={17} className="shrink-0 text-ok" />
                    <span className="whitespace-nowrap">Terbaik Hingga:</span>
                    <span className="whitespace-nowrap font-bold text-foreground underline decoration-ok underline-offset-2">
                      {formatMonthYear(estDateStr)} · {Math.max(0, daySlider)}hr
                    </span>
                  </p>
                  <span className="text-lg font-bold text-foreground">{formatPct(dayPctLive)}</span>
                </div>

                {showAdjust && (
                  <>
                    <div className="my-4 h-px bg-border" />
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      Sesuaikan sisa penggunaan agar cocok dengan kondisi komponen Anda.
                    </p>
                    <Slider
                      className="mt-4 accent-[#DFFF00] [&_[data-slot=slider-range]]:bg-[var(--range-c)] [&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:w-6 [&_[data-slot=slider-thumb]]:border-[3px] [&_[data-slot=slider-thumb]]:border-card [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-muted"
                      style={{ '--range-c': dayPctLive <= 0.1 ? 'var(--danger)' : dayPctLive < 0.25 ? 'var(--warn)' : rangeColor } as React.CSSProperties}
                      value={[Math.min(Math.max(0, daySlider), component.intervalDays)]}
                      min={0}
                      max={Math.max(component.intervalDays, 1)}
                      step={1}
                      onValueChange={(v) => setDaySliderLocal(v[0])}
                      onValueCommit={async (v) => {
                        await onPatch({ setRemainingDays: v[0] })
                        setDaySliderLocal(null)
                      }}
                      aria-label="Sesuaikan sisa waktu"
                    />
                  </>
                )}

                <div className="mt-5 flex items-start gap-2 rounded-2xl bg-muted p-3">
                  <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Umur komponen adalah perkiraan umum. Rujuk manual kendaraan untuk informasi
                    akurat.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdjust((s) => !s)}
                  className="press mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted py-3 text-[15px] font-bold text-muted-foreground hover:text-foreground active:scale-[0.99]"
                >
                  {showAdjust ? 'Sembunyikan Penyesuaian' : 'Tampilkan Penyesuaian'}
                  {showAdjust ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>
              </div>

              {/* Status chip ringkas */}
              {health && (
                <div
                  className={cn(
                    'flex items-center justify-between rounded-2xl px-4 py-3',
                    status === 'ganti'
                      ? 'bg-danger/10'
                      : status === 'segera'
                        ? 'bg-warn/15'
                        : 'bg-lime'
                  )}
                >
                  <span className="text-sm font-semibold text-muted-foreground">Status komponen</span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      status === 'ganti'
                        ? 'text-danger'
                        : status === 'segera'
                          ? 'text-warn'
                          : 'text-on-lime'
                    )}
                  >
                    {statusLabel(status)}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={onOpenService}
                className="press flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-hero py-4 text-[15px] font-bold text-hero-foreground shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                <Wrench size={18} />
                Catat Penggantian / Servis
              </button>

              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="mx-auto flex items-center gap-1.5 py-2 text-sm font-semibold text-danger active:opacity-70"
              >
                <Trash2 size={15} />
                Lepas Komponen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={onOpenService}
                className="press flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground active:scale-[0.99]"
              >
                <Plus size={16} />
                Tambah Riwayat
              </button>
              {componentRecords.length === 0 ? (
                <div className="rounded-[26px] border border-border/70 bg-card p-8 text-center shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Belum ada riwayat</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Catat penggantian atau servis untuk melihat riwayat komponen ini.
                  </p>
                </div>
              ) : (
                componentRecords.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-[26px] border border-border/70 bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime/25 text-on-lime dark:text-lime">
                      <ComponentIcon icon={component.icon} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {r.type === 'ganti' ? 'Penggantian' : 'Servis'} {component.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatKm(r.odometer)} km · {formatDate(r.date)}
                      </p>
                      {r.note && <p className="mt-0.5 text-xs text-muted-foreground">“{r.note}”</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent className="max-w-[320px] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Lepas komponen ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {component.name} akan dilepas dari kendaraan dan bisa ditambahkan kembali lewat
              katalog Perawatan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-danger text-background hover:bg-danger/90"
              onClick={onRemove}
            >
              Lepas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
