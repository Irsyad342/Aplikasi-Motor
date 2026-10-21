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
import { Segmented } from './ui-bits'

const STATUS_RANGE: Record<ComponentStatus, string> = {
  ganti: '#ef4444',
  segera: '#f59e0b',
  sehat: '#0ea5e9',
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
      className="absolute inset-0 z-50 flex flex-col bg-[#f2f3f5]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
    >
      {/* Top bar */}
      <div className="px-3 pb-1 pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 active:bg-zinc-200/60"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Title */}
      <div className="flex items-center gap-4 px-4 pt-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <ComponentIcon icon={component.icon} size={40} className="text-zinc-900" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-bold leading-tight text-zinc-900">
            {component.name}
          </h1>
          <p className="text-[15px] text-zinc-400">
            Servis Terakhir:{' '}
            <span className="font-semibold text-zinc-600">
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
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              {/* Interval Servis */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="whitespace-nowrap text-lg font-bold text-zinc-900">Interval Servis</h2>
                  <p className="whitespace-nowrap text-[13px] text-zinc-400">
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
                    className="w-24 rounded-xl bg-zinc-100 px-2 py-2 text-center text-lg font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-sky-400"
                    aria-label="Interval servis dalam km"
                  />
                  <span className="text-base font-semibold text-zinc-500">km</span>
                </div>
              </div>

              {/* Sisa penggunaan */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[15px] font-semibold text-zinc-500">
                  Sisa Penggunaan:{' '}
                  <span className="text-xl font-bold text-zinc-900">
                    {formatKm(kmSlider)} km
                  </span>
                </p>
                <span className="text-lg font-bold text-zinc-700">{formatPct(kmPctLive)}</span>
              </div>

              {showAdjust && (
                <>
                  <div className="my-4 h-px bg-zinc-100" />
                  <p className="text-[13px] leading-relaxed text-zinc-400">
                    Sesuaikan sisa penggunaan agar cocok dengan kondisi komponen Anda.
                  </p>
                  <Slider
                    className="mt-4 [&_[data-slot=slider-range]]:bg-[var(--range-c)] [&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:w-6 [&_[data-slot=slider-thumb]]:border-[3px] [&_[data-slot=slider-thumb]]:border-zinc-100 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-zinc-200/80"
                    style={{ '--range-c': kmPctLive <= 0.1 ? '#ef4444' : kmPctLive < 0.25 ? '#f59e0b' : rangeColor } as React.CSSProperties}
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

              <div className="my-5 h-px bg-zinc-100" />

              {/* Interval Waktu */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="whitespace-nowrap text-lg font-bold text-zinc-900">Interval Waktu</h2>
                  <p className="whitespace-nowrap text-[13px] text-zinc-400">
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
                    className="w-20 rounded-xl bg-zinc-100 px-2 py-2 text-center text-lg font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-sky-400"
                    aria-label="Interval waktu dalam bulan"
                  />
                  <span className="text-base font-semibold text-zinc-500">bln</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-zinc-500">
                  <Calendar size={17} className="shrink-0 text-sky-500" />
                  <span className="whitespace-nowrap">Terbaik Hingga:</span>
                  <span className="whitespace-nowrap font-bold text-sky-600 underline decoration-sky-300 underline-offset-2">
                    {formatMonthYear(estDateStr)} · {Math.max(0, daySlider)}hr
                  </span>
                </p>
                <span className="text-lg font-bold text-zinc-700">{formatPct(dayPctLive)}</span>
              </div>

              {showAdjust && (
                <>
                  <div className="my-4 h-px bg-zinc-100" />
                  <p className="text-[13px] leading-relaxed text-zinc-400">
                    Sesuaikan sisa penggunaan agar cocok dengan kondisi komponen Anda.
                  </p>
                  <Slider
                    className="mt-4 [&_[data-slot=slider-range]]:bg-[var(--range-c)] [&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:w-6 [&_[data-slot=slider-thumb]]:border-[3px] [&_[data-slot=slider-thumb]]:border-zinc-100 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-zinc-200/80"
                    style={{ '--range-c': dayPctLive <= 0.1 ? '#ef4444' : dayPctLive < 0.25 ? '#f59e0b' : rangeColor } as React.CSSProperties}
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

              <div className="mt-5 flex items-start gap-2 rounded-2xl bg-zinc-50 p-3">
                <Info size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                <p className="text-xs leading-relaxed text-zinc-400">
                  Umur komponen adalah perkiraan umum. Rujuk manual kendaraan untuk informasi
                  akurat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdjust((s) => !s)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-zinc-100 py-3 text-[15px] font-bold text-zinc-500 active:scale-[0.99]"
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
                    ? 'bg-red-50'
                    : status === 'segera'
                      ? 'bg-amber-50'
                      : 'bg-green-50'
                )}
              >
                <span className="text-sm font-semibold text-zinc-600">Status komponen</span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    status === 'ganti'
                      ? 'text-red-600'
                      : status === 'segera'
                        ? 'text-amber-600'
                        : 'text-green-600'
                  )}
                >
                  {statusLabel(status)}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenService}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 py-4 text-[15px] font-bold text-white shadow-lg shadow-sky-500/25 active:scale-[0.98]"
            >
              <Wrench size={18} />
              Catat Penggantian / Servis
            </button>

            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="mx-auto flex items-center gap-1.5 py-2 text-sm font-semibold text-red-500 active:opacity-70"
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
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 py-3.5 text-sm font-bold text-zinc-500 active:scale-[0.99]"
            >
              <Plus size={16} />
              Tambah Riwayat
            </button>
            {componentRecords.length === 0 ? (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-zinc-700">Belum ada riwayat</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Catat penggantian atau servis untuk melihat riwayat komponen ini.
                </p>
              </div>
            ) : (
              componentRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50">
                    <ComponentIcon icon={component.icon} size={18} className="text-sky-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-800">
                      {r.type === 'ganti' ? 'Penggantian' : 'Servis'} {component.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatKm(r.odometer)} km · {formatDate(r.date)}
                    </p>
                    {r.note && <p className="mt-0.5 text-xs text-zinc-400">“{r.note}”</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
              className="rounded-full bg-red-500 text-white hover:bg-red-600"
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
