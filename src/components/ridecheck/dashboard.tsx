'use client'

import { useMemo, useState } from 'react'
import {
  Bike,
  CarFront,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Gauge,
  Plus,
  Settings,
  TriangleAlert,
  Bell,
  Circle,
  Rotate3d,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatKm, formatMonthYear, statusOrder } from '@/lib/status'
import type { AppState, ComponentDTO, VehicleDTO } from '@/lib/state'

// Viewer 3D (client-only, tidak dirender di server)
const Vehicle3D = dynamic(() => import('./vehicle-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-sky-400 border-t-transparent" />
    </div>
  ),
})
import { ComponentCard, ManageCard, Segmented, StatusBadge } from './ui-bits'
import { ComponentIcon } from './icons'

interface DashboardProps {
  state: AppState
  vehicle: VehicleDTO
  tab: 'komponen' | 'perawatan'
  onTabChange: (t: 'komponen' | 'perawatan') => void
  onOpenDetail: (id: string) => void
  onSwitchVehicle: (id: string) => void
  onOpenAddVehicle: () => void
  onOpenSettings: () => void
  onEditOdometer: () => void
  onInstall: (c: ComponentDTO) => void
  onManageComponent: (c: ComponentDTO) => void
  onSelectComponent: (c: ComponentDTO) => void
  onToggleSelectMode: () => void
  selectMode: boolean
  selectedIds: Set<string>
  autoTrack: boolean
  reminder: boolean
  onToggleAutoTrack: () => void
  onToggleReminder: () => void
}

function SectionHeader({
  label,
  count,
  tone,
  icon: Icon,
}: {
  label: string
  count: number
  tone: 'red' | 'amber' | 'green'
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const tones = {
    red: { icon: 'text-red-500', badge: 'bg-red-100 text-red-600' },
    amber: { icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-600' },
    green: { icon: 'text-green-500', badge: 'bg-green-100 text-green-700' },
  }[tone]
  return (
    <div className="mb-2.5 flex items-center gap-2 px-1">
      <Icon size={18} className={tones.icon} />
      <h2 className="text-[15px] font-bold text-zinc-800">{label}</h2>
      <span
        className={cn(
          'ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold',
          tones.badge
        )}
      >
        {count}
      </span>
    </div>
  )
}

export function Dashboard(props: DashboardProps) {
  const { state, vehicle, tab, onTabChange } = props
  const [expanded, setExpanded] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const installed = useMemo(
    () => state.components.filter((c) => c.installed && c.health),
    [state.components]
  )
  const uninstalled = useMemo(
    () => state.components.filter((c) => !c.installed),
    [state.components]
  )

  const byStatus = useMemo(() => {
    const ganti = installed
      .filter((c) => c.health!.status === 'ganti')
      .sort((a, b) => a.health!.worstPct - b.health!.worstPct)
    const segera = installed
      .filter((c) => c.health!.status === 'segera')
      .sort((a, b) => a.health!.worstPct - b.health!.worstPct)
    const sehat = installed.filter((c) => c.health!.status === 'sehat')
    return { ganti, segera, sehat }
  }, [installed])

  const attention = useMemo(
    () =>
      [...byStatus.ganti, ...byStatus.segera].sort(
        (a, b) => statusOrder(a.health!.status) - statusOrder(b.health!.status) || a.health!.worstPct - b.health!.worstPct
      ),
    [byStatus]
  )
  const shownAttention = expanded ? attention : attention.slice(0, 3)


  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f2f3f5]/95 px-4 pb-2.5 pt-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1 rounded-full py-1 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              aria-label="Pilih kendaraan"
            >
              <span className="max-w-44 truncate text-[17px] font-bold text-zinc-900">
                {vehicle.name}
              </span>
              <ChevronDown size={18} className="text-zinc-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5">
              {state.vehicles.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => props.onSwitchVehicle(v.id)}
                  className="gap-2.5 rounded-xl py-2.5 text-[15px] font-semibold"
                >
                  {v.id === vehicle.id ? (
                    <Check size={18} className="text-zinc-800" />
                  ) : (
                    <span className="w-[18px]" />
                  )}
                  {v.type === 'mobil' ? (
                    <CarFront size={18} className="text-zinc-500" />
                  ) : (
                    <Bike size={18} className="text-zinc-500" />
                  )}
                  <span className="truncate">{v.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={props.onOpenAddVehicle}
                className="gap-2.5 rounded-xl py-2.5 text-[15px] font-semibold"
              >
                <span className="flex w-[18px] justify-center">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-zinc-900 text-white">
                    <Plus size={12} strokeWidth={3} />
                  </span>
                </span>
                Tambah Kendaraan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={props.onOpenSettings}
              aria-label="Pengaturan"
              className="text-zinc-800 active:opacity-70"
            >
              <Settings size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Chips */}
      <div className="flex items-center gap-2 px-4 pt-1">
        <button
          type="button"
          onClick={props.onToggleAutoTrack}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            props.autoTrack ? 'bg-sky-100 text-sky-600' : 'bg-zinc-200/80 text-zinc-500'
          )}
        >
          {props.autoTrack ? <Circle size={12} className="fill-sky-500 text-sky-500" /> : <Circle size={12} className="fill-zinc-400 text-zinc-400" />}
          Lacak Otomatis
        </button>
        <button
          type="button"
          onClick={props.onToggleReminder}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            props.reminder ? 'bg-sky-100 text-sky-600' : 'bg-sky-100/60 text-sky-600/70'
          )}
        >
          <Bell size={12} />
          Pengingat Otomatis
        </button>
      </div>

      {/* Odometer */}
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={props.onEditOdometer}
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-white py-3.5 shadow-sm transition-transform active:scale-[0.98]"
          aria-label="Ubah odometer"
        >
          <Gauge size={22} className="text-zinc-700" />
          <span className="text-[26px] font-bold leading-none tracking-tight text-zinc-900 tabular-nums">
            {formatKm(vehicle.odometer)}
          </span>
          <span className="text-lg font-medium text-zinc-400">km</span>
        </button>
      </div>

      {/* Hero: kendaraan 3D, bisa diputar 360° */}
      <div className="relative mt-2 h-52">
        <div className="absolute left-1/2 top-1/2 h-44 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(250,140,160,0.6),rgba(254,202,202,0.35),transparent)] blur-lg" />
        <Vehicle3D type={vehicle.type} />
        <span className="pointer-events-none absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-zinc-500 shadow-sm backdrop-blur-sm">
          <Rotate3d size={12} className="text-sky-500" />
          Putar 360° · geser untuk memutar
        </span>
      </div>

      {/* Ringkasan paling penting */}
      <div className="px-4">
        {attention.length > 0 ? (
          <div className="rounded-3xl border border-red-200/80 bg-white p-4 shadow-sm">
            <div className="mb-2.5 flex justify-end">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-600">
                Paling Penting
              </span>
            </div>
            <div className="space-y-3">
              {shownAttention.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => props.onOpenDetail(c.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <ComponentIcon icon={c.icon} size={22} className="shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-800">
                      {c.name}
                    </span>
                    <span className="block text-xs text-zinc-400">
                      est. {formatMonthYear(c.health!.estDate)}
                    </span>
                  </span>
                  <StatusBadge status={c.health!.status} />
                </button>
              ))}
            </div>
            {attention.length > 3 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-semibold text-zinc-500"
              >
                {expanded ? 'Lihat Lebih Sedikit' : `Lihat ${attention.length - 3} Lainnya`}
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-3xl border border-green-200/80 bg-white p-4 shadow-sm">
            <CircleCheck size={26} className="shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-bold text-zinc-800">Semua komponen sehat!</p>
              <p className="text-xs text-zinc-400">
                Tidak ada komponen yang perlu diperhatikan saat ini.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex items-center gap-2.5 px-4">
        <Segmented
          className="flex-1"
          value={tab}
          onChange={onTabChange}
          options={[
            { value: 'komponen', label: 'Komponen' },
            { value: 'perawatan', label: 'Perawatan' },
          ]}
        />
        <button
          type="button"
          onClick={props.onToggleSelectMode}
          className={cn(
            'rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95',
            props.selectMode ? 'bg-zinc-700' : 'bg-sky-500'
          )}
        >
          {props.selectMode ? 'Batal' : 'Pilih'}
        </button>
      </div>

      {/* Konten tab */}
      {tab === 'komponen' ? (
        <div className="space-y-5 px-4 pt-4">
          {byStatus.ganti.length > 0 && (
            <section aria-label="Perlu perhatian">
              <SectionHeader
                label="Perlu perhatian"
                count={byStatus.ganti.length}
                tone="red"
                icon={CircleAlert}
              />
              <div className="grid grid-cols-2 gap-3">
                {byStatus.ganti.map((c) => (
                  <ComponentCard
                    key={c.id}
                    component={c}
                    onSelect={(c) => props.onOpenDetail(c.id)}
                    selectMode={props.selectMode}
                    selected={props.selectedIds.has(c.id)}
                    onToggleSelect={props.onSelectComponent}
                  />
                ))}
              </div>
            </section>
          )}

          {byStatus.segera.length > 0 && (
            <section aria-label="Periksa segera">
              <SectionHeader
                label="Periksa Segera"
                count={byStatus.segera.length}
                tone="amber"
                icon={TriangleAlert}
              />
              <div className="grid grid-cols-2 gap-3">
                {byStatus.segera.map((c) => (
                  <ComponentCard
                    key={c.id}
                    component={c}
                    onSelect={(c) => props.onOpenDetail(c.id)}
                    selectMode={props.selectMode}
                    selected={props.selectedIds.has(c.id)}
                    onToggleSelect={props.onSelectComponent}
                  />
                ))}
              </div>
            </section>
          )}

          {byStatus.sehat.length > 0 && (
            <section aria-label="Sehat">
              <SectionHeader
                label="Sehat"
                count={byStatus.sehat.length}
                tone="green"
                icon={CircleCheck}
              />
              <div className="grid grid-cols-2 gap-3">
                {byStatus.sehat.map((c) => (
                  <ComponentCard
                    key={c.id}
                    component={c}
                    onSelect={(c) => props.onOpenDetail(c.id)}
                    selectMode={props.selectMode}
                    selected={props.selectedIds.has(c.id)}
                    onToggleSelect={props.onSelectComponent}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tambah komponen */}
          {uninstalled.length > 0 && (
            <div className="pb-2">
              <button
                type="button"
                onClick={() => setAddOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-white py-3.5 text-[15px] font-bold text-zinc-800 shadow-sm active:scale-[0.98]"
              >
                Tambah Komponen
                <ChevronDown
                  size={18}
                  className={cn('transition-transform', addOpen && 'rotate-180')}
                />
              </button>
              {addOpen && (
                <div className="mt-3 space-y-1 rounded-3xl bg-white p-2 shadow-sm">
                  {uninstalled.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                      <ComponentIcon icon={c.icon} size={22} className="text-zinc-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-800">{c.name}</p>
                        <p className="text-[11px] text-zinc-400">
                          Interval {formatKm(c.intervalKm)} km / {Math.round(c.intervalDays / 30)} bln
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => props.onInstall(c)}
                        className="rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-bold text-sky-600 active:scale-95"
                      >
                        Tambah
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-4">
          <p className="mb-3 px-1 text-xs leading-relaxed text-zinc-400">
            Kelola komponen kendaraan Anda. Tambahkan komponen baru dari katalog atau atur yang sudah terpasang.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[...installed, ...uninstalled]
              .sort((a, b) => Number(b.installed) - Number(a.installed) || a.name.localeCompare(b.name))
              .map((c) => (
                <ManageCard key={c.id} component={c} onSelect={props.onManageComponent} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
