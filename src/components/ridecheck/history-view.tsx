'use client'

import { useMemo, useState } from 'react'
import { Clock, Crown, Download, Map } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate, formatDuration, formatKm, formatKm1 } from '@/lib/status'
import type { AppState, VehicleDTO } from '@/lib/state'
import { ComponentIcon } from './icons'
import { EmptyState } from './ui-bits'

type Filter = 'semua' | 'servis' | 'perjalanan'

interface Item {
  id: string
  kind: 'servis' | 'perjalanan'
  date: number
  title: string
  subtitle: string
  icon: string // component icon key or 'trip'
  note?: string | null
}

export function HistoryView({
  state,
  vehicle,
  onOpenDetail,
}: {
  state: AppState
  vehicle: VehicleDTO
  onOpenDetail: (componentId: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('semua')

  const items = useMemo<Item[]>(() => {
    const servis: Item[] = state.records.map((r) => ({
      id: r.id,
      kind: 'servis',
      date: new Date(r.date).getTime(),
      title: `${r.type === 'ganti' ? 'Ganti' : 'Servis'} ${r.componentName}`,
      subtitle: `${formatKm(r.odometer)} km · ${formatDate(r.date)}`,
      icon: r.componentIcon,
      note: r.note,
    }))
    const trips: Item[] = state.trips.map((t) => ({
      id: t.id,
      kind: 'perjalanan',
      date: new Date(t.startedAt).getTime(),
      title: `Perjalanan ${formatKm1(t.distance)} km`,
      subtitle: `${formatDuration(t.duration)} · ${formatDate(t.startedAt)}`,
      icon: 'trip',
    }))
    return [...servis, ...trips].sort((a, b) => b.date - a.date)
  }, [state.records, state.trips])

  const shown = items.filter((i) =>
    filter === 'semua' ? true : filter === 'servis' ? i.kind === 'servis' : i.kind === 'perjalanan'
  )

  const FILTERS: Array<{ value: Filter; label: string }> = [
    { value: 'semua', label: 'Semua' },
    { value: 'servis', label: 'Servis' },
    { value: 'perjalanan', label: 'Perjalanan' },
  ]

  return (
    <div className="pb-6">
      <header className="flex items-center justify-between px-4 pb-3 pt-5">
        <h1 className="text-xl font-bold text-zinc-900">Riwayat {vehicle.name}</h1>
        {/* Fitur Premium: ekspor CSV */}
        <button
          type="button"
          onClick={() => {
            const rows: string[][] = [
              ['Jenis', 'Komponen', 'Odometer (km)', 'Tanggal', 'Catatan'],
              ...state.records.map((r) => [
                r.type === 'ganti' ? 'Ganti' : 'Servis',
                r.componentName,
                String(r.odometer),
                formatDate(r.date),
                r.note ?? '',
              ]),
            ]
            const csv = rows
              .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
              .join('\n')
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ridecheck-riwayat-${vehicle.name.replace(/\s+/g, '-').toLowerCase()}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Riwayat servis diekspor (Premium)')
          }}
          className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 active:scale-95"
          aria-label="Ekspor riwayat servis CSV"
        >
          <Download size={13} />
          Ekspor
          <Crown size={11} className="text-amber-500" />
        </button>
      </header>

      <div className="flex gap-2 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
              filter === f.value
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-500 shadow-sm'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Belum Ada Riwayat"
          description="Riwayat servis dan perjalanan kendaraan Anda akan tampil di sini."
        />
      ) : (
        <div className="space-y-2.5 px-4 pt-4">
          {shown.map((i) => (
            <button
              key={`${i.kind}-${i.id}`}
              type="button"
              onClick={() =>
                i.kind === 'servis' && state.records.find((r) => r.id === i.id)
                  ? onOpenDetail(state.records.find((r) => r.id === i.id)!.componentId)
                  : undefined
              }
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  i.kind === 'perjalanan' ? 'bg-sky-50' : 'bg-zinc-100'
                )}
              >
                {i.kind === 'perjalanan' ? (
                  <Map size={19} className="text-sky-600" />
                ) : (
                  <ComponentIcon icon={i.icon} size={19} className="text-zinc-600" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-800">
                  {i.title}
                </span>
                <span className="block text-xs text-zinc-400">{i.subtitle}</span>
                {i.note && <span className="block text-xs text-zinc-400">“{i.note}”</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
