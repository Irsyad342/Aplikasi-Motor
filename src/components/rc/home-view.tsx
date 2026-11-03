'use client'

/**
 * HomeView — layar utama MotoMate (design system "Neon Lime").
 * Semua data dihitung dari props, tanpa data dummy.
 */

import { useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CircleDollarSign,
  Gauge,
  History,
  MapPinned,
  MapPin,
  Route,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentDTO, ExpenseDTO, RecordDTO, TripDTO, VehicleDTO } from '@/lib/state'
import type { ComponentStatus } from '@/lib/status'
import { formatKm, formatDate, statusOrder } from '@/lib/status'
import { cn } from '@/lib/utils'
import {
  Btn,
  Card,
  EmptyState,
  HighlightTile,
  IconBtn,
  Pill,
  SectionTitle,
  StatCard,
  formatRupiah,
  type QuickAction,
} from '@/components/rc/ui'
import { ComponentIcon } from '@/components/ridecheck/icons'

export interface HomeViewProps {
  vehicle: VehicleDTO
  components: ComponentDTO[]
  trips: TripDTO[]
  records: RecordDTO[]
  expenses: ExpenseDTO[]
  onQuickAction: (a: QuickAction) => void
  onOpenBengkel: () => void
  onOpenDetail: (id: string) => void
}

// ---------- Helper ----------

/** Tone ProgressBar dari status komponen (versi sempit, aman tipe). */
function barTone(s: ComponentStatus): 'lime' | 'amber' | 'red' {
  return s === 'ganti' ? 'red' : s === 'segera' ? 'amber' : 'lime'
}

const EXPENSE_LABEL: Record<string, string> = {
  bensin: 'Bensin',
  parkir: 'Parkir',
  servis: 'Servis',
}

const QUICK_ACTIONS: Array<{ a: QuickAction; label: string; icon: LucideIcon; primary?: boolean }> = [
  { a: 'trip', label: 'Perjalanan', icon: Route, primary: true },
  { a: 'service', label: 'Servis', icon: Wrench },
  { a: 'expense', label: 'Biaya', icon: CircleDollarSign },
  { a: 'history', label: 'Riwayat', icon: History },
  { a: 'odometer', label: 'KM', icon: Gauge },
]

/** Pembungkus section dengan animasi masuk halus. */
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

// ---------- View ----------

export function HomeView({
  vehicle,
  components,
  trips,
  records,
  expenses,
  onQuickAction,
  onOpenBengkel,
  onOpenDetail,
}: HomeViewProps) {
  // ----- Health ringkas -----
  const installed = useMemo(() => components.filter((c) => c.installed && c.health), [components])
  const attentionCount = useMemo(
    () => installed.filter((c) => c.health!.status !== 'sehat').length,
    [installed]
  )

  // Komponen paling mendesak: status terburuk dulu, lalu persentase terkecil
  const nextDue = useMemo(
    () =>
      [...installed].sort(
        (a, b) =>
          statusOrder(a.health!.status) - statusOrder(b.health!.status) ||
          a.health!.worstPct - b.health!.worstPct
      )[0] ?? null,
    [installed]
  )

  // ----- Statistik -----
  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth()
  const kmThisMonth = useMemo(
    () =>
      trips
        .filter((t) => {
          const d = new Date(t.startedAt)
          return d.getFullYear() === nowYear && d.getMonth() === nowMonth
        })
        .reduce((s, t) => s + t.distance, 0),
    [trips, nowYear, nowMonth]
  )

  const totalSpend = useMemo(
    () =>
      records.reduce((s, r) => s + (r.cost ?? 0), 0) +
      expenses.reduce((s, e) => s + e.amount, 0),
    [records, expenses]
  )

  const totalKm = useMemo(() => trips.reduce((s, t) => s + t.distance, 0), [trips])

  // Biaya bulan ini (servis + pengeluaran harian)
  const costThisMonth = useMemo(() => {
    const inMonth = (iso: string) => {
      const d = new Date(iso)
      return d.getFullYear() === nowYear && d.getMonth() === nowMonth
    }
    return (
      records.filter((r) => inMonth(r.date)).reduce((s, r) => s + (r.cost ?? 0), 0) +
      expenses.filter((e) => inMonth(e.date)).reduce((s, e) => s + e.amount, 0)
    )
  }, [records, expenses, nowYear, nowMonth])

  // ----- Aktivitas terakhir -----
  const activities = useMemo(() => {
    const items = [
      ...records.map((r) => ({
        id: `r${r.id}`,
        date: new Date(r.date).getTime(),
        icon: <ComponentIcon icon={r.componentIcon} size={18} />,
        title: r.componentName,
        sub: `${r.type === 'ganti' ? 'Diganti' : 'Diservis'} · ${formatDate(r.date)}`,
        right: r.cost ? `Rp${formatRupiah(r.cost)}` : '',
      })),
      ...trips.map((t) => ({
        id: `t${t.id}`,
        date: new Date(t.startedAt).getTime(),
        icon: <Route size={18} />,
        title: `Perjalanan ${t.distance.toFixed(1).replace('.', ',')} km`,
        sub: formatDate(t.startedAt),
        right: '',
      })),
      ...expenses.map((e) => ({
        id: `e${e.id}`,
        date: new Date(e.date).getTime(),
        icon: <Wallet size={18} />,
        title: EXPENSE_LABEL[e.category] ?? 'Lainnya',
        sub: formatDate(e.date),
        right: `Rp${formatRupiah(e.amount)}`,
      })),
    ]
    return items.sort((a, b) => b.date - a.date).slice(0, 6)
  }, [records, trips, expenses])

  const lastServiceLine = records[0]?.date
    ? `Servis terakhir ${formatDate(records[0].date)}`
    : 'Belum ada catatan servis'

  return (
    <div className="space-y-6">
      {/* ---------- 1. Hero kendaraan (minimalis, tanpa foto) ---------- */}
      <Section>
        <Card className="rounded-[28px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold break-words tracking-tight text-foreground">
                {vehicle.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Pill tone="dark">{vehicle.type === 'motor' ? 'Motor' : 'Mobil'}</Pill>
                {vehicle.plate && <Pill tone="outline">{vehicle.plate}</Pill>}
              </div>
            </div>
            <Pill tone={attentionCount > 0 ? 'red' : 'lime'} className="mt-1 shrink-0">
              {attentionCount > 0 ? `${attentionCount} perlu perhatian` : 'Kondisi Prima'}
            </Pill>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Odometer
              </div>
              <div className="stat-num text-4xl leading-tight text-foreground">
                {formatKm(vehicle.odometer)}
                <span className="ml-1 text-base font-bold text-muted-foreground">km</span>
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-muted-foreground">
                {lastServiceLine}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <IconBtn label="Perbarui odometer" tone="lime" onClick={() => onQuickAction('odometer')}>
                <Gauge size={18} />
              </IconBtn>
              <IconBtn label="Cari bengkel terdekat" tone="card" onClick={onOpenBengkel}>
                <MapPin size={18} />
              </IconBtn>
            </div>
          </div>

          {/* Highlight info ringkas */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {nextDue && nextDue.health ? (
              <HighlightTile
                label="Servis"
                dot={barTone(nextDue.health.status)}
                value={nextDue.name}
                sub={
                  nextDue.health.kmRemaining > 0
                    ? `Sisa ${formatKm(nextDue.health.kmRemaining)} km`
                    : 'Jatuh tempo'
                }
                onClick={() => onOpenDetail(nextDue.id)}
              />
            ) : (
              <HighlightTile
                label="Servis"
                dot={installed.length > 0 ? 'lime' : null}
                value={installed.length > 0 ? 'Aman' : '—'}
                sub={installed.length > 0 ? 'Semua sehat' : 'Belum ada'}
              />
            )}
            <HighlightTile
              label="Bulan Ini"
              value={
                <>
                  {formatKm(kmThisMonth)}
                  <span className="ml-0.5 text-[11px] font-bold text-muted-foreground">km</span>
                </>
              }
              sub="jarak tempuh"
            />
            <HighlightTile
              label="Biaya"
              value={
                <>
                  <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
                  {formatRupiah(costThisMonth)}
                </>
              }
              sub="bulan ini"
            />
          </div>
        </Card>
      </Section>

      {/* ---------- 2. Quick actions ---------- */}
      <Section delay={0.05}>
        <div className="grid grid-cols-5 gap-2">
          {QUICK_ACTIONS.map(({ a, label, icon: Icon, primary }) => (
            <button
              key={a}
              type="button"
              onClick={() => onQuickAction(a)}
              className={cn(
                'press flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[22px] px-1 py-3',
                primary
                  ? 'bg-lime text-on-lime'
                  : 'border border-border/70 bg-card text-foreground'
              )}
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ---------- 3. Statistik ---------- */}
      <Section delay={0.1}>
        <SectionTitle title="Statistik" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            className="col-span-2 flex-row items-center justify-between gap-4"
            icon={
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-on-lime">
                <Route size={20} />
              </span>
            }
            label="Total Jarak Tempuh"
            value={formatKm(totalKm)}
            unit="km"
          />
          <StatCard icon={<MapPinned size={18} />} label="Total Perjalanan" value={trips.length} />
          <StatCard
            icon={<Wallet size={18} />}
            label="Pengeluaran Tercatat"
            value={`Rp${formatRupiah(totalSpend)}`}
          />
        </div>
      </Section>

      {/* ---------- 5. Aktivitas terakhir ---------- */}
      <Section delay={0.2}>
        <SectionTitle
          title="Aktivitas Terakhir"
          action="Lihat Semua"
          onAction={() => onQuickAction('history')}
        />
        {activities.length > 0 ? (
          <Card className="divide-y divide-border/60">
            {activities.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {item.title}
                  </span>
                  <span className="block truncate text-[12px] text-muted-foreground">{item.sub}</span>
                </span>
                {item.right && (
                  <span className="stat-num shrink-0 text-[13px] text-foreground">{item.right}</span>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={<History size={22} />}
            title="Belum ada aktivitas"
            desc="Catat servis, biaya, atau mulai perjalanan untuk melihat riwayat di sini."
            action={
              <Btn variant="lime" size="sm" onClick={() => onQuickAction('service')}>
                Catat Servis
              </Btn>
            }
          />
        )}
      </Section>

      {/* ---------- 6. CTA Bengkel ---------- */}
      <Section delay={0.25}>
        <Card className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime text-on-lime">
              <MapPin size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-foreground">
                Butuh bengkel terdekat?
              </p>
              <p className="truncate text-[12px] text-muted-foreground">Cari bengkel di Pulau Jawa</p>
            </div>
          </div>
          <IconBtn label="Buka peta bengkel" tone="lime" onClick={onOpenBengkel}>
            <ArrowUpRight size={18} />
          </IconBtn>
        </Card>
      </Section>
    </div>
  )
}
