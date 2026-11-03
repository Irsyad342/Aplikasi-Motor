'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Bike, Check, MapPin, Plus, Wrench } from 'lucide-react'
import type { ComponentDTO, RecordDTO, VehicleDTO } from '@/lib/state'
import {
  formatKm,
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
  onUninstallSelected: () => void
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

/** Label pendek untuk pill mini di kartu grid */
function shortLabel(s: ComponentStatus): string {
  return s === 'ganti' ? 'Ganti' : s === 'segera' ? 'Segera' : 'Sehat'
}

/** Kartu indikator putih kecil di dalam panel lime — angka + titik status.
    Warna teks statis (tinta gelap) karena latar tile putih di kedua tema. */
function IndicatorTile({
  label,
  value,
  dot,
}: {
  label: string
  value: number
  dot: 'sehat' | 'segera' | 'ganti'
}) {
  const dotCls =
    dot === 'ganti' ? 'bg-[#ff4d3d]' : dot === 'segera' ? 'bg-[#e8a317]' : 'bg-[#a4cc0d]'
  return (
    <div className="min-w-0 rounded-[18px] bg-white px-2.5 py-2.5 shadow-[0_1px_2px_rgba(16,17,16,0.08)]">
      <span className="flex items-center gap-1">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotCls)} aria-hidden="true" />
        <span className="truncate text-[9px] font-bold uppercase tracking-[0.04em] text-[#63655f]">
          {label}
        </span>
      </span>
      <span className="stat-num mt-1 block text-[22px] leading-none text-[#101110]">{value}</span>
    </div>
  )
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

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <motion.header {...fade}>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Perawatan</h1>
      </motion.header>

      {/* Panel kondisi — dashboard lime ala MotoMate: profil kendaraan, persen sehat,
          progress bar, dan ringkasan status dalam satu kartu minimalis */}
      <motion.section {...fade} aria-label="Ringkasan kondisi komponen">
        <div className="rounded-[28px] bg-lime p-5 text-on-lime">
          {/* Profil kendaraan */}
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-lime/10">
              <Bike size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold leading-tight">{vehicle.name}</p>
              <p className="mt-0.5 text-[12px] font-bold opacity-70">{formatKm(vehicle.odometer)} km odometer</p>
            </div>
            <span className="shrink-0 rounded-full bg-on-lime px-3 py-1.5 text-[11px] font-extrabold leading-none text-lime">
              {installed.length} Dipantau
            </span>
          </div>

          {/* Indikator kondisi — tiga kartu putih, selalu tampil ketiganya */}
          {installed.length > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              <IndicatorTile label="Sehat" value={counts.sehat} dot="sehat" />
              <IndicatorTile label="Segera" value={counts.segera} dot="segera" />
              <IndicatorTile label="Jatuh Tempo" value={counts.ganti} dot="ganti" />
            </div>
          ) : (
            <p className="mt-5 text-[13px] font-bold leading-snug opacity-90">
              Belum ada komponen dipantau — pasang dari katalog di bawah untuk mulai memantau kondisi motor.
            </p>
          )}
        </div>
      </motion.section>

      {/* Mode pilih komponen */}
      <motion.div {...fade}>
        <Btn full variant={selectMode ? 'lime' : 'outline'} onClick={onToggleSelectMode}>
          {selectMode
            ? `Batal Pilih${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`
            : 'Pilih Komponen'}
        </Btn>
        {selectMode && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Pilih komponen lalu tandai diganti atau lepas dari motor
          </p>
        )}
      </motion.div>

      {/* Komponen terpasang — grid dashboard */}
      <motion.section {...fade}>
        <SectionTitle title="Komponen Terpasang" />
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Wrench size={22} />}
            title="Belum ada komponen terpasang"
            desc="Pasang komponen dari katalog di bawah untuk mulai memantau kondisinya."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((c, i) => {
              const h = c.health
              const selected = selectedIds.has(c.id)
              return (
                <motion.div
                  key={c.id}
                  {...fade}
                  transition={{ ...fade.transition, delay: Math.min(i * 0.04, 0.2) }}
                  className="h-full"
                >
                  <Card
                    padded={false}
                    /* Mode pilih: satu kartu penuh jadi tombol — semua area bisa diklik,
                       bukan hanya teks nama (perbaikan bug tap tidak merespons) */
                    {...(selectMode ? { onClick: () => onToggleSelect(c) } : {})}
                    className={cn(
                      'flex h-full flex-col p-4',
                      selectMode && selected && 'border-lime bg-lime/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <ComponentIcon icon={c.icon} size={19} />
                      </span>
                      {selectMode ? (
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            selected ? 'border-lime bg-lime text-on-lime' : 'border-border'
                          )}
                        >
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                      ) : (
                        <Pill tone={statusTone(h.status)} className="px-2.5 text-[10px]">
                          {shortLabel(h.status)}
                        </Pill>
                      )}
                    </div>
                    {selectMode ? (
                      <div className="mt-3 min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-foreground">
                          {c.name}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block truncate text-[11px] font-semibold',
                            h.kmRemaining > 0 ? 'text-muted-foreground' : 'text-danger'
                          )}
                        >
                          {h.kmRemaining > 0
                            ? `Sisa ${formatKm(h.kmRemaining)} km`
                            : 'Sudah jatuh tempo'}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenDetail(c.id)}
                        aria-label={`Detail ${c.name}`}
                        className="press mt-3 min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate text-[13px] font-bold text-foreground">
                          {c.name}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block truncate text-[11px] font-semibold',
                            h.kmRemaining > 0 ? 'text-muted-foreground' : 'text-danger'
                          )}
                        >
                          {h.kmRemaining > 0
                            ? `Sisa ${formatKm(h.kmRemaining)} km`
                            : 'Sudah jatuh tempo'}
                        </span>
                      </button>
                    )}
                    <div className="mt-3">
                      <ProgressBar pct={h.worstPct} tone={barTone(h.status)} />
                    </div>
                    {!selectMode && (
                      <button
                        type="button"
                        onClick={() => onOpenService(c)}
                        className="press mt-2.5 inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-full border border-border/70 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Wrench size={12} /> Catat Servis
                      </button>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.section>

      {/* Katalog — belum terpasang (grid) */}
      {catalog.length > 0 && (
        <motion.section {...fade}>
          <SectionTitle title="Katalog Komponen" />
          <div className="grid grid-cols-2 gap-3">
            {catalog.map((c) => (
              <Card key={c.id} padded={false} className="flex h-full flex-col p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <ComponentIcon icon={c.icon} size={19} />
                </span>
                <div className="mt-2.5 min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-foreground">{c.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    {formatKm(c.intervalKm)} km / {Math.round(c.intervalDays / 30)} bln
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onInstall(c)}
                  className="press mt-2.5 inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-full bg-lime text-[11px] font-bold text-on-lime transition-[filter] hover:brightness-105"
                >
                  <Plus size={13} strokeWidth={2.6} /> Pasang
                </button>
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
