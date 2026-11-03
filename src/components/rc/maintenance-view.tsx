'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, MapPin, Plus, Wrench } from 'lucide-react'
import type { ComponentDTO, RecordDTO, VehicleDTO } from '@/lib/state'
import {
  formatKm,
  formatMonthYear,
  statusLabel,
  statusOrder,
  type ComponentStatus,
} from '@/lib/status'
import { cn } from '@/lib/utils'
import {
  Btn,
  Card,
  EmptyState,
  IconBtn,
  Pill,
  ProgressBar,
  SectionTitle,
  statusTone,
} from '@/components/rc/ui'
import { ComponentIcon } from '@/components/ridecheck/icons'

export interface MaintenanceViewProps {
  vehicle: VehicleDTO
  components: ComponentDTO[]
  records: RecordDTO[]
  onOpenDetail: (id: string) => void
  onOpenService: (c: ComponentDTO) => void
  onInstall: (c: ComponentDTO) => void
  onOpenBengkel: () => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (c: ComponentDTO) => void
  onToggleSelectMode: () => void
  onMarkSelected: () => void
}

type InstalledComponent = ComponentDTO & { health: NonNullable<ComponentDTO['health']> }

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

/** ProgressBar hanya menerima tone grafis — petakan status ke warna batang */
function barTone(s: ComponentStatus): 'lime' | 'amber' | 'red' {
  return s === 'ganti' ? 'red' : s === 'segera' ? 'amber' : 'lime'
}

export function MaintenanceView({
  vehicle,
  components,
  onOpenDetail,
  onOpenService,
  onInstall,
  onOpenBengkel,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectMode,
}: MaintenanceViewProps) {
  const installed = useMemo(
    () => components.filter((c): c is InstalledComponent => c.installed && c.health !== null),
    [components]
  )

  // Urutkan: paling kritis dulu (status lalu persen sisa terkecil)
  const sorted = useMemo(
    () =>
      [...installed].sort((a, b) => {
        const byStatus = statusOrder(a.health.status) - statusOrder(b.health.status)
        if (byStatus !== 0) return byStatus
        return a.health.worstPct - b.health.worstPct
      }),
    [installed]
  )

  const catalog = useMemo(() => components.filter((c) => !c.installed), [components])

  const counts = useMemo(() => {
    let sehat = 0
    let segera = 0
    let ganti = 0
    for (const c of installed) {
      if (c.health.status === 'ganti') ganti += 1
      else if (c.health.status === 'segera') segera += 1
      else sehat += 1
    }
    return { sehat, segera, ganti }
  }, [installed])

  const tiles: Array<{ label: string; value: number; dot: string | null }> = [
    { label: 'Dipantau', value: installed.length, dot: null },
    { label: 'Sehat', value: counts.sehat, dot: 'bg-lime' },
    { label: 'Segera', value: counts.segera, dot: 'bg-warn' },
    { label: 'Jatuh Tempo', value: counts.ganti, dot: 'bg-danger' },
  ]

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <motion.header {...fade}>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Perawatan</h1>
        <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
          {vehicle.name} · {formatKm(vehicle.odometer)} km
        </p>
      </motion.header>

      {/* Tile statistik */}
      <motion.div {...fade} className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <Card key={t.label} className="p-3 text-center">
            <div className="stat-num text-xl leading-none text-foreground">{t.value}</div>
            <div className="mt-1.5 flex items-center justify-center gap-1">
              {t.dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />}
              <span className="text-center text-[10px] font-bold leading-tight text-muted-foreground">
                {t.label}
              </span>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Mode pilih komponen */}
      <motion.div {...fade}>
        <Btn full variant={selectMode ? 'lime' : 'outline'} onClick={onToggleSelectMode}>
          {selectMode
            ? `Batal Pilih${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`
            : 'Pilih Komponen'}
        </Btn>
        {selectMode && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Pilih komponen lalu tandai sudah diganti
          </p>
        )}
      </motion.div>

      {/* Komponen terpasang */}
      <motion.section {...fade}>
        <SectionTitle title="Komponen Terpasang" />
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Wrench size={22} />}
            title="Belum ada komponen terpasang"
            desc="Pasang komponen dari katalog di bawah untuk mulai memantau kondisinya."
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((c, i) => {
              const h = c.health
              const selected = selectedIds.has(c.id)
              return (
                <motion.div
                  key={c.id}
                  {...fade}
                  transition={{ ...fade.transition, delay: Math.min(i * 0.05, 0.25) }}
                >
                  <Card padded={false} className={cn('p-4', selectMode && selected && 'border-lime')}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => (selectMode ? onToggleSelect(c) : onOpenDetail(c.id))}
                        aria-label={`Detail ${c.name}`}
                        className="press flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                          <ComponentIcon icon={c.icon} size={22} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-foreground">{c.name}</span>
                            <Pill tone={statusTone(h.status)}>{statusLabel(h.status)}</Pill>
                          </span>
                          <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                            {h.kmRemaining > 0
                              ? `Sisa ${formatKm(h.kmRemaining)} km · Est. ${formatMonthYear(h.estDate)}`
                              : 'Sudah jatuh tempo'}
                          </span>
                        </span>
                      </button>
                      {selectMode ? (
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                            selected ? 'border-lime bg-lime text-on-lime' : 'border-border'
                          )}
                        >
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                      ) : (
                        <IconBtn
                          label="Catat servis"
                          tone="ghost"
                          className="h-9 w-9"
                          onClick={() => onOpenService(c)}
                        >
                          <Wrench size={16} />
                        </IconBtn>
                      )}
                    </div>
                    <div className="mt-3">
                      <ProgressBar pct={h.worstPct} tone={barTone(h.status)} />
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.section>

      {/* Katalog — belum terpasang */}
      {catalog.length > 0 && (
        <motion.section {...fade}>
          <SectionTitle title="Katalog Komponen" />
          <div className="space-y-2">
            {catalog.map((c) => (
              <Card key={c.id} padded={false} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <ComponentIcon icon={c.icon} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {formatKm(c.intervalKm)} km / {Math.round(c.intervalDays / 30)} bln
                    </p>
                  </div>
                </div>
                <IconBtn label="Pasang" tone="lime" className="h-9 w-9" onClick={() => onInstall(c)}>
                  <Plus size={16} />
                </IconBtn>
              </Card>
            ))}
          </div>
        </motion.section>
      )}

      {/* CTA bengkel */}
      <motion.div {...fade}>
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-on-lime">
            <MapPin size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-foreground">Butuh bengkel?</p>
            <p className="text-[12px] text-muted-foreground">Temukan bengkel terdekat di Pulau Jawa</p>
          </div>
          <IconBtn label="Temukan bengkel" tone="lime" onClick={onOpenBengkel}>
            <ArrowUpRight size={18} />
          </IconBtn>
        </Card>
      </motion.div>
    </div>
  )
}
