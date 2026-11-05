'use client'

/**
 * HistoryView — "Riwayat & Analitik".
 * Tiga tab: Perawatan (riwayat servis + biaya per bulan),
 * Perjalanan (trip + km per bulan), dan Biaya (pengeluaran gabungan + daftar expense).
 */

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  Fuel,
  MoreHorizontal,
  Pencil,
  Route,
  SquareParking,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { ComponentDTO, ExpenseDTO, RecordDTO, TripDTO, VehicleDTO } from '@/lib/state'
import { formatDate, formatDuration, formatKm, formatKm1, statusLabel, statusOrder, type ComponentStatus } from '@/lib/status'
import {
  Card,
  ConfirmSheet,
  EmptyState,
  IconBtn,
  LimeBarChart,
  LimeLineChart,
  Pill,
  ProgressBar,
  SectionTitle,
  StatCard,
  formatRupiah,
  statusTone,
  type ChartPoint,
} from '@/components/rc/ui'
import { TripCard, TripDetailSheet } from '@/components/rc/trip-ui'
import { ComponentIcon } from '@/components/ridecheck/icons'
import { cn } from '@/lib/utils'
import { EditExpenseSheet, EditRecordSheet, EditTripSheet } from '@/components/rc/history-edit-sheets'

export interface HistoryViewProps {
  vehicle: VehicleDTO
  components: ComponentDTO[]
  records: RecordDTO[]
  trips: TripDTO[]
  expenses: ExpenseDTO[]
  onBack: () => void
  onOpenDetail: (id: string) => void
  onDeleteExpense: (id: string) => void
  onDeleteTrip: (id: string) => void
  onDeleteRecord: (id: string) => void
  onEditTrip: (id: string, data: { distance: number; date: string }) => Promise<void>
  onEditExpense: (
    id: string,
    data: { category: string; amount: number; liters?: number | null; note: string; date: string }
  ) => Promise<void>
  onEditRecord: (
    id: string,
    data: { type: string; odometer: number; date: string; cost: number | null; workshop: string; note: string }
  ) => Promise<void>
}

type Tab = 'perawatan' | 'perjalanan' | 'biaya'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'perawatan', label: 'Perawatan' },
  { key: 'perjalanan', label: 'Perjalanan' },
  { key: 'biaya', label: 'Biaya' },
]

// ---------- Helper bulan (id-ID) ----------

interface MonthBucket {
  key: string
  label: string
  year: number
  month: number
}

function lastMonths(n: number): MonthBucket[] {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('id-ID', { month: 'short' })
  const out: MonthBucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: fmt.format(d),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return out
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function byMonth(dates: Array<{ date: string; value: number }>, months: MonthBucket[]): ChartPoint[] {
  return months.map((m) => ({
    label: m.label,
    value: dates
      .filter((d) => monthKey(d.date) === m.key)
      .reduce((acc, d) => acc + d.value, 0),
  }))
}

const hasValue = (data: ChartPoint[]): boolean => data.some((d) => d.value > 0)

// ---------- Label & ikon kategori biaya ----------

function categoryLabel(c: string): string {
  if (c === 'bensin') return 'Bensin'
  if (c === 'parkir') return 'Parkir'
  if (c === 'servis') return 'Servis'
  return 'Lainnya'
}

function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const cls = 'text-muted-foreground'
  if (category === 'bensin') return <Fuel size={size} className={cls} />
  if (category === 'parkir') return <SquareParking size={size} className={cls} />
  if (category === 'servis') return <Wrench size={size} className={cls} />
  return <MoreHorizontal size={size} className={cls} />
}

// ---------- Analitik keausan komponen ----------

const DAY_MS = 86_400_000
type HealthRow = ComponentDTO & { health: NonNullable<ComponentDTO['health']> }

function barTone(s: ComponentStatus): 'lime' | 'amber' | 'red' {
  return s === 'ganti' ? 'red' : s === 'segera' ? 'amber' : 'lime'
}

/** Kalimat analitik singkat: berapa lama terpasang & sisa umur pakai. */
function componentSub(c: HealthRow, odometer: number): string {
  const h = c.health
  const daysInstalled = Math.max(
    0,
    Math.round((Date.now() - new Date(c.lastServiceDate).getTime()) / DAY_MS)
  )
  if (c.intervalKm > 0) {
    if (h.kmRemaining <= 0) {
      const over = Math.max(0, odometer - c.lastServiceOdo - c.intervalKm)
      return `Terpasang ${daysInstalled} hari · lewat ${formatKm(over)} km dari batas`
    }
    return `Terpasang ${daysInstalled} hari · sisa ${formatKm(h.kmRemaining)} km`
  }
  if (h.daysRemaining <= 0) return `Terpasang ${daysInstalled} hari · jatuh tempo`
  return `Terpasang ${daysInstalled} hari · sisa ${h.daysRemaining} hari`
}

// ---------- Kerangka kecil ----------

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function HistoryView({
  vehicle,
  components,
  records,
  trips,
  expenses,
  onBack,
  onOpenDetail,
  onDeleteExpense,
  onDeleteTrip,
  onDeleteRecord,
  onEditTrip,
  onEditExpense,
  onEditRecord,
}: HistoryViewProps) {
  const [tab, setTab] = useState<Tab>('perawatan')
  const months = useMemo(() => lastMonths(6), [])

  // Entri yang sedang diedit lewat sheet
  const [editTrip, setEditTrip] = useState<TripDTO | null>(null)
  const [editExpense, setEditExpense] = useState<ExpenseDTO | null>(null)
  const [editRecord, setEditRecord] = useState<RecordDTO | null>(null)
  // Detail & konfirmasi hapus perjalanan (sheet responsif, bukan dialog browser)
  const [detailTrip, setDetailTrip] = useState<TripDTO | null>(null)
  const [confirmDelTrip, setConfirmDelTrip] = useState<TripDTO | null>(null)

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records]
  )
  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [trips]
  )
  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  )

  // --- Analitik komponen: urut dari yang paling aus / paling mendesak ---
  const healthRows = useMemo<HealthRow[]>(
    () =>
      components
        .filter((c): c is HealthRow => c.installed && c.health !== null)
        .sort(
          (a, b) =>
            statusOrder(a.health.status) - statusOrder(b.health.status) ||
            a.health.worstPct - b.health.worstPct
        ),
    [components]
  )
  const gantiRows = healthRows.filter((c) => c.health.status === 'ganti')
  const segeraRows = healthRows.filter((c) => c.health.status === 'segera')
  const litersFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })

  // --- Perhitungan per tab ---
  const serviceCostTotal = records.reduce((acc, r) => acc + (r.cost ?? 0), 0)
  const serviceChart = useMemo(
    () => byMonth(records.filter((r) => r.cost != null).map((r) => ({ date: r.date, value: r.cost ?? 0 })), months),
    [records, months]
  )
  const totalKm = trips.reduce((acc, t) => acc + t.distance, 0)
  const tripChart = useMemo(
    () => byMonth(trips.map((t) => ({ date: t.startedAt, value: t.distance })), months),
    [trips, months]
  )
  const expenseTotal = expenses.reduce((acc, e) => acc + e.amount, 0)
  const grandTotal = expenseTotal + serviceCostTotal
  const expenseChart = useMemo(
    () =>
      byMonth(
        [
          ...expenses.map((e) => ({ date: e.date, value: e.amount })),
          ...records.filter((r) => r.cost != null).map((r) => ({ date: r.date, value: r.cost ?? 0 })),
        ],
        months
      ),
    [expenses, records, months]
  )

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <FadeUp>
        <div className="flex items-center gap-3">
          <IconBtn label="Kembali" tone="card" onClick={onBack}>
            <ArrowLeft size={20} />
          </IconBtn>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Riwayat & Analitik
          </h1>
        </div>
      </FadeUp>

      {/* Tab segmented */}
      <FadeUp delay={0.04}>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  'press relative flex min-h-9 items-center justify-center rounded-full text-[13px] font-bold transition-colors',
                  active ? 'text-on-lime' : 'text-muted-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="hist-tab"
                    transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                    className="absolute inset-0 rounded-full bg-lime"
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            )
          })}
        </div>
      </FadeUp>

      {/* ================= TAB: PERAWATAN ================= */}
      {tab === 'perawatan' && (
        <div className="space-y-6">
          {/* ---------- Analitik kondisi komponen ---------- */}
          <FadeUp delay={0.04}>
            <section className="space-y-2.5">
              <SectionTitle title="Kondisi Komponen" />
              {healthRows.length === 0 ? (
                <EmptyState
                  icon={<Wrench size={22} />}
                  title="Belum ada komponen terpasang"
                  desc="Tambahkan komponen lewat menu Perawatan untuk melihat analitik keausannya di sini."
                />
              ) : (
                <>
                  {/* Sorotan: komponen yang paling perlu diganti */}
                  {gantiRows.length > 0 ? (
                    <Card className="border-danger/30 bg-danger/5">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
                          <AlertTriangle size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-foreground">
                            {gantiRows.length} komponen sudah jatuh tempo
                          </p>
                          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                            Prioritaskan ganti{' '}
                            <span className="font-bold text-foreground">
                              {gantiRows.slice(0, 2).map((c) => c.name).join(' & ')}
                              {gantiRows.length > 2 ? ` +${gantiRows.length - 2} lainnya` : ''}
                            </span>{' '}
                            agar motor tetap prima.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : segeraRows.length > 0 ? (
                    <Card className="border-warn/40 bg-warn/10">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warn/20 text-warn">
                          <AlertTriangle size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-foreground">
                            {segeraRows.length} komponen mendekati batas ganti
                          </p>
                          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                            Siapkan penggantian untuk{' '}
                            <span className="font-bold text-foreground">
                              {segeraRows.slice(0, 2).map((c) => c.name).join(' & ')}
                              {segeraRows.length > 2 ? ` +${segeraRows.length - 2} lainnya` : ''}
                            </span>{' '}
                            sebelum melewati jadwal.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="border-lime/50 bg-lime/10">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime text-on-lime">
                          <BadgeCheck size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-foreground">
                            Semua komponen sehat
                          </p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            Tidak ada yang perlu diganti sekarang. Pertahankan rutinitas servis.
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Daftar keausan — paling aus di atas */}
                  <Card padded={false} className="overflow-hidden">
                    <div className="divide-y divide-border/60">
                      {healthRows.map((c, i) => {
                        const h = c.health
                        const wear = Math.max(0, Math.min(100, Math.round((1 - h.worstPct) * 100)))
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onOpenDetail(c.id)}
                            className="press block w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <ComponentIcon icon={c.icon} size={18} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
                                  <span className="truncate">{c.name}</span>
                                </p>
                                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                                  {componentSub(c, vehicle.odometer)}
                                </p>
                              </div>
                              {i === 0 && h.status !== 'sehat' ? (
                                <Pill tone={statusTone(h.status)} className="shrink-0">
                                  Paling prioritas
                                </Pill>
                              ) : (
                                <Pill tone={statusTone(h.status)} className="shrink-0">
                                  {statusLabel(h.status)}
                                </Pill>
                              )}
                            </div>
                            <div className="mt-2.5 flex items-center gap-2">
                              <ProgressBar
                                pct={wear / 100}
                                tone={barTone(h.status)}
                                className="h-1.5 flex-1"
                              />
                              <span className="stat-num shrink-0 text-[11px] text-muted-foreground">
                                {wear}% terpakai
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </Card>
                </>
              )}
            </section>
          </FadeUp>

          <FadeUp delay={0.06}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Wrench size={16} />} label="Total Servis" value={records.length} />
              <StatCard
                icon={<CircleDollarSign size={16} />}
                label="Biaya Tercatat"
                value={`Rp ${formatRupiah(serviceCostTotal)}`}
              />
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            {hasValue(serviceChart) ? (
              <Card>
                <p className="text-[15px] font-extrabold tracking-tight text-foreground">
                  Biaya per bulan
                </p>
                <p className="text-[12px] text-muted-foreground">
                  6 bulan terakhir · {vehicle.name}
                </p>
                <div className="mt-3">
                  <LimeBarChart data={serviceChart} unit="Rp" />
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<CircleDollarSign size={22} />}
                title="Belum ada data biaya"
                desc="Tambahkan biaya saat mencatat servis untuk melihat grafik per bulan."
              />
            )}
          </FadeUp>

          <FadeUp delay={0.14}>
            <section>
              <SectionTitle title="Riwayat Servis" />
              {sortedRecords.length === 0 ? (
                <EmptyState
                  icon={<Wrench size={22} />}
                  title="Belum ada riwayat servis"
                  desc="Catat servis komponen agar tercatat rapi di sini."
                />
              ) : (
                <div className="space-y-2.5">
                  {sortedRecords.map((r) => (
                    <Card key={r.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <ComponentIcon icon={r.componentIcon} size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-foreground">
                            {r.componentName}
                          </p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {r.type === 'ganti' ? 'Penggantian' : 'Servis'} · {formatDate(r.date)} ·{' '}
                            {formatKm(r.odometer)} km
                          </p>
                          {(r.workshop || r.note) && (
                            <p className="mt-0.5 truncate text-[12px] text-muted-foreground/80">
                              {[r.workshop, r.note].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {r.cost != null && (
                            <p className="stat-num text-[15px] text-foreground">
                              Rp{formatRupiah(r.cost)}
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <IconBtn
                              label={`Edit catatan ${r.componentName}`}
                              tone="ghost"
                              className="h-8 w-8 hover:text-foreground"
                              onClick={() => setEditRecord(r)}
                            >
                              <Pencil size={15} />
                            </IconBtn>
                            <IconBtn
                              label={`Hapus catatan ${r.componentName}`}
                              tone="ghost"
                              className="h-8 w-8 hover:text-danger"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Hapus catatan ${r.type === 'ganti' ? 'penggantian' : 'servis'} ${r.componentName}? Sisa pakai komponen akan disesuaikan otomatis.`
                                  )
                                )
                                  onDeleteRecord(r.id)
                              }}
                            >
                              <Trash2 size={15} />
                            </IconBtn>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </FadeUp>
        </div>
      )}

      {/* ================= TAB: PERJALANAN ================= */}
      {tab === 'perjalanan' && (
        <div className="space-y-6">
          <FadeUp delay={0.06}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Route size={16} />}
                label="Total Jarak"
                value={formatKm1(totalKm)}
                unit="km"
              />
              <StatCard icon={<Route size={16} />} label="Jumlah Trip" value={trips.length} />
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            {hasValue(tripChart) ? (
              <Card>
                <p className="text-[15px] font-extrabold tracking-tight text-foreground">
                  Km per bulan
                </p>
                <p className="text-[12px] text-muted-foreground">6 bulan terakhir</p>
                <div className="mt-3">
                  <LimeLineChart data={tripChart} unit="km" />
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<Route size={22} />}
                title="Belum ada data perjalanan"
                desc="Mulai tracking perjalanan untuk melihat grafik jarak bulanan."
              />
            )}
          </FadeUp>

          <FadeUp delay={0.14}>
            <section>
              <SectionTitle title="Daftar Trip" />
              {sortedTrips.length === 0 ? (
                <EmptyState
                  icon={<Route size={22} />}
                  title="Belum ada perjalanan"
                  desc="Perjalanan yang terekam akan tampil di sini."
                />
              ) : (
                <div className="space-y-2.5">
                  {sortedTrips.map((t) => (
                    <TripCard key={t.id} trip={t} onClick={() => setDetailTrip(t)} />
                  ))}
                </div>
              )}
            </section>
          </FadeUp>
        </div>
      )}

      {/* ================= TAB: BIAYA ================= */}
      {tab === 'biaya' && (
        <div className="space-y-6">
          <FadeUp delay={0.06}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<CircleDollarSign size={16} />}
                label="Total Pengeluaran"
                value={`Rp ${formatRupiah(grandTotal)}`}
              />
              <StatCard
                icon={<Wrench size={16} />}
                label="Biaya Servis"
                value={`Rp ${formatRupiah(serviceCostTotal)}`}
              />
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            {hasValue(expenseChart) ? (
              <Card>
                <p className="text-[15px] font-extrabold tracking-tight text-foreground">
                  Pengeluaran per bulan
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Gabungan biaya harian & servis · 6 bulan terakhir
                </p>
                <div className="mt-3">
                  <LimeBarChart data={expenseChart} unit="Rp" />
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<CircleDollarSign size={22} />}
                title="Belum ada pengeluaran"
                desc="Catat bensin, parkir, atau servis untuk melihat grafik pengeluaran."
              />
            )}
          </FadeUp>

          <FadeUp delay={0.14}>
            <section>
              <SectionTitle title="Pengeluaran" />
              {sortedExpenses.length === 0 ? (
                <EmptyState
                  icon={<CircleDollarSign size={22} />}
                  title="Belum ada pengeluaran"
                  desc="Riwayat biaya harian seperti bensin dan parkir akan tampil di sini."
                />
              ) : (
                <div className="space-y-2.5">
                  {sortedExpenses.map((e) => (
                    <Card key={e.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <CategoryIcon category={e.category} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-bold text-foreground">
                            {categoryLabel(e.category)}
                            {e.liters != null && (
                              <span className="ml-1.5 font-semibold text-muted-foreground">
                                · {litersFmt.format(e.liters)} L
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {e.note ?? formatDate(e.date)}
                          </p>
                        </div>
                        <p className="stat-num shrink-0 text-[15px] text-foreground">
                          Rp{formatRupiah(e.amount)}
                        </p>
                        <div className="flex shrink-0 items-center">
                          <IconBtn
                            label="Edit pengeluaran"
                            tone="ghost"
                            className="h-8 w-8 hover:text-foreground"
                            onClick={() => setEditExpense(e)}
                          >
                            <Pencil size={15} />
                          </IconBtn>
                          <IconBtn
                            label="Hapus pengeluaran"
                            tone="ghost"
                            className="h-8 w-8 hover:text-danger"
                            onClick={() => {
                              if (window.confirm('Hapus pengeluaran ini?')) onDeleteExpense(e.id)
                            }}
                          >
                            <Trash2 size={15} />
                          </IconBtn>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </FadeUp>
        </div>
      )}

      {/* ---------- Sheet riwayat ---------- */}
      <TripDetailSheet
        open={detailTrip !== null}
        trip={detailTrip}
        onClose={() => setDetailTrip(null)}
        onEdit={(t) => setEditTrip(t)}
        onDelete={(t) => setConfirmDelTrip(t)}
      />
      <EditTripSheet
        open={editTrip !== null}
        trip={editTrip}
        onClose={() => setEditTrip(null)}
        onSubmit={onEditTrip}
      />
      <ConfirmSheet
        open={confirmDelTrip !== null}
        onClose={() => setConfirmDelTrip(null)}
        onConfirm={() => {
          if (confirmDelTrip) onDeleteTrip(confirmDelTrip.id)
          setConfirmDelTrip(null)
        }}
        title="Hapus Perjalanan?"
        desc={
          confirmDelTrip
            ? `Perjalanan ${formatKm1(confirmDelTrip.distance)} km tanggal ${formatDate(confirmDelTrip.startedAt)} akan dihapus. Odometer kendaraan dikembalikan otomatis.`
            : ''
        }
        confirmLabel="Hapus"
        danger
      />
      <EditExpenseSheet
        open={editExpense !== null}
        expense={editExpense}
        onClose={() => setEditExpense(null)}
        onSubmit={onEditExpense}
      />
      <EditRecordSheet
        open={editRecord !== null}
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSubmit={onEditRecord}
      />
    </div>
  )
}
