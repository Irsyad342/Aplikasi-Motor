'use client'

/**
 * HistoryView — "Riwayat & Analitik".
 * Tiga tab: Perawatan (riwayat servis + biaya per bulan),
 * Perjalanan (trip + km per bulan), dan Biaya (pengeluaran gabungan + daftar expense).
 */

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CircleDollarSign,
  Fuel,
  MoreHorizontal,
  Route,
  SquareParking,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { ExpenseDTO, RecordDTO, TripDTO, VehicleDTO } from '@/lib/state'
import { formatDate, formatDuration, formatKm, formatKm1 } from '@/lib/status'
import {
  Card,
  EmptyState,
  IconBtn,
  LimeBarChart,
  LimeLineChart,
  Pill,
  SectionTitle,
  StatCard,
  formatRupiah,
  type ChartPoint,
} from '@/components/rc/ui'
import { ComponentIcon } from '@/components/ridecheck/icons'
import { cn } from '@/lib/utils'

export interface HistoryViewProps {
  vehicle: VehicleDTO
  records: RecordDTO[]
  trips: TripDTO[]
  expenses: ExpenseDTO[]
  onBack: () => void
  onOpenDetail: (id: string) => void
  onDeleteExpense: (id: string) => void
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
  records,
  trips,
  expenses,
  onBack,
  onOpenDetail,
  onDeleteExpense,
}: HistoryViewProps) {
  const [tab, setTab] = useState<Tab>('perawatan')
  const months = useMemo(() => lastMonths(6), [])

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
                  active ? 'text-ink' : 'text-muted-foreground'
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
                    <Card key={r.id} onClick={() => onOpenDetail(r.componentId)} className="p-4">
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
                        <div className="shrink-0 text-right">
                          {r.cost != null ? (
                            <p className="stat-num text-[15px] text-foreground">
                              Rp{formatRupiah(r.cost)}
                            </p>
                          ) : (
                            <Pill tone="outline">{r.type === 'ganti' ? 'Ganti' : 'Servis'}</Pill>
                          )}
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
                    <Card key={t.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Route size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-bold text-foreground">
                            {formatDate(t.startedAt)}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {t.source} · {formatDuration(t.duration)}
                          </p>
                        </div>
                        <p className="stat-num shrink-0 text-[15px] text-foreground">
                          {formatKm1(t.distance)}
                          <span className="ml-1 text-[11px] font-bold text-muted-foreground">km</span>
                        </p>
                      </div>
                    </Card>
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
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {e.note ?? formatDate(e.date)}
                          </p>
                        </div>
                        <p className="stat-num shrink-0 text-[15px] text-foreground">
                          Rp{formatRupiah(e.amount)}
                        </p>
                        <IconBtn
                          label="Hapus pengeluaran"
                          tone="ghost"
                          className="h-9 w-9 hover:text-danger"
                          onClick={() => {
                            if (window.confirm('Hapus pengeluaran ini?')) onDeleteExpense(e.id)
                          }}
                        >
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </FadeUp>
        </div>
      )}
    </div>
  )
}
