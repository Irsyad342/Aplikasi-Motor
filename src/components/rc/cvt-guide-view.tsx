'use client'

/**
 * CvtGuideView — halaman khusus "Perawatan CVT & Throttle Body".
 * Terpisah dari daftar komponen: dua tab (CVT / Throttle Body) berisi
 * panduan lengkap (jadwal, langkah servis, tanda kerusakan, tips, biaya)
 * PLUS pencatatan perawatan langsung di halaman ini: tombol "Mulai Catat"
 * dan riwayat catatan CVT / Throttle Body per kendaraan.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Cog,
  Gauge,
  Lightbulb,
  MapPin,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { ComponentDTO, CvtLogDTO } from '@/lib/state'
import { formatDate, formatKm, statusLabel } from '@/lib/status'
import { cn } from '@/lib/utils'
import {
  Btn,
  Card,
  Field,
  formatRupiah,
  IconBtn,
  inputCls,
  Pill,
  ProgressBar,
  SectionTitle,
  Sheet,
  statusTone,
} from '@/components/rc/ui'
import { ComponentIcon } from '@/components/ridecheck/icons'

type Tab = 'cvt' | 'tb'

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

function todayInput(): string {
  const d = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---------- Item pencatatan (harus sama dengan validasi API) ----------

const CVT_ITEMS = [
  { key: 'bersih-rumah-cvt', label: 'Bersih Rumah CVT', icon: 'cog', syncs: '' },
  { key: 'ganti-v-belt', label: 'Ganti V-Belt', icon: 'spline', syncs: 'V-Belt CVT & Tensioner' },
  { key: 'ganti-roller', label: 'Ganti Roller', icon: 'donut', syncs: 'Roller CVT' },
  { key: 'oli-gardan', label: 'Ganti Oli Gardan', icon: 'droplet', syncs: 'Oli Gardan' },
] as const

const TB_ITEMS = [
  { key: 'bersih-throttle-body', label: 'Bersih Throttle Body', icon: 'gauge', syncs: 'Throttle Body' },
  { key: 'ganti-filter-udara', label: 'Ganti Filter Udara', icon: 'wind', syncs: 'Filter Udara' },
] as const

function itemsOf(kind: Tab) {
  return kind === 'cvt' ? CVT_ITEMS : TB_ITEMS
}

// ---------- Konten CVT ----------

const CVT_SCHEDULE = [
  { icon: 'cog', title: 'Bersih Rumah CVT', km: 8000, note: 'Sekali tiap 8.000 km atau 6 bulan' },
  { icon: 'spline', title: 'Ganti V-Belt', km: 24000, note: 'Cek retak/melar saat servis rutin' },
  { icon: 'donut', title: 'Ganti Roller', km: 24000, note: 'Bobot diganti sesuai standar pabrik' },
  { icon: 'droplet', title: 'Oli Gardan', km: 8000, note: 'Melumasi girbox di belakang CVT' },
] as const

const CVT_STEPS = [
  'Buka cover rumah CVT di badan tengah motor',
  'Bersihkan debu kampas & kotoran di dalam rumah CVT',
  'Lepas dan ukur roller — ganti bila flat spot atau bobot berubah',
  'Cek lebar V-Belt — ganti bila melar atau retak',
  'Periksa ketebalan kampas kopling (susah) & per kopling',
  'Rakit kembali, pasang seal & dust cover dengan benar',
  'Uji jalan — tarikan harus halus tanpa bantingan',
]

const CVT_SYMPTOMS = [
  'Bantingan (jank) saat motor mulai berjalan',
  'Tarikan berat dan akselerasi lemot',
  'Suara kasar atau getar dari badan tengah',
  'RPM tinggi tapi kecepatan tidak ikut naik (belt slip)',
  'Mesin hidup tapi motor tidak mau bergerak',
]

const CVT_TIPS = [
  'Hindari genangan dan banjir — air masuk CVT bikin slip & bantingan',
  'Jangan dipakai menarik beban berlebih atau dijadikan motor "tambang"',
  'Gunakan V-Belt, roller, dan kampas original atau setara standar',
  'Panaskan motor 1–2 menit sebelum dipakai berangkat',
  'Jangan bongkar rumah CVT sendiri tanpa peralatan — rakitannya presisi',
]

// ---------- Konten Throttle Body ----------

const TB_SYMPTOMS = [
  'Idle tidak stabil — putaran mesin naik-turun sendiri',
  'Mesin mati mendadak saat idle atau kondisi dingin',
  'Tarikan tersendat / kurang responsif saat gas dibuka',
  'Konsumsi bahan bakar jadi boros',
  'Lampu indikator FI menyala di speedometer',
]

const TB_STEPS = [
  'Buka filter udara dan lepas throttle body dari manifold',
  'Semprot cleaner khusus throttle body ke carbon & butterfly',
  'Bersihkan duktus udara — jangan gunakan sikat kasar',
  'Cek kondisi filter udara, ganti bila kotor tebal',
  'Pasang kembali dengan seal yang baik',
  'Kalibrasi idle & posisi TPS lewat scanner / tuning FI',
  'Uji idle — harus stabil sekitar 1.400–1.700 rpm saat dingin menengah',
]

const TB_TIPS = [
  'Selalu ganti/bersihkan filter udara sesuai jadwal — pencegahan paling murah',
  'Gunakan cleaner khusus throttle body, bukan cairan sembarangan',
  'Setelah dibersihkan WAJIB kalibrasi via scanner — idle bisa kacau tanpa itu',
  'Pilih bengkel injeksi/tuner yang punya scanner untuk motormu',
]

// ---------- Sub-komponen kecil ----------

/** Tile jadwal: ikon + judul + interval besar */
function ScheduleTile({ icon, title, km, note }: { icon: string; title: string; km: number; note: string }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-muted/60 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-foreground shadow-[0_1px_2px_rgba(16,17,16,0.06)]">
        <ComponentIcon icon={icon} size={17} />
      </span>
      <p className="mt-2.5 truncate text-[13px] font-extrabold text-foreground">{title}</p>
      <p className="stat-num mt-1 text-[18px] leading-none text-foreground">
        {formatKm(km)} <span className="text-[11px] font-bold text-muted-foreground">km</span>
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{note}</p>
    </div>
  )
}

/** Baris berbutang centang — langkah servis di bengkel */
function StepRow({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-[11px] font-extrabold text-on-lime">
        {index}
      </span>
      <span className="text-[13px] leading-snug text-foreground">{text}</span>
    </li>
  )
}

/** Baris tanda masalah / tips dengan ikon bulat */
function InfoRow({
  tone,
  icon,
  text,
}: {
  tone: 'warn' | 'tip'
  icon: React.ReactNode
  text: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-lime/15 text-foreground'
        )}
      >
        {icon}
      </span>
      <span className="text-[13px] leading-snug text-foreground">{text}</span>
    </li>
  )
}

/** Judul seksi kecil di dalam tab */
function GuideSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-[13px] font-extrabold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Kartu kondisi komponen terkait yang terpasang */
function RelatedComponentCard({
  c,
  onOpenDetail,
}: {
  c: ComponentDTO & { health: NonNullable<ComponentDTO['health']> }
  onOpenDetail: (id: string) => void
}) {
  const h = c.health
  return (
    <Card
      padded={false}
      onClick={() => onOpenDetail(c.id)}
      className="flex items-center gap-3 p-4"
      aria-label={`Detail ${c.name}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        <ComponentIcon icon={c.icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-bold text-foreground">{c.name}</span>
          <Pill tone={statusTone(h.status)} className="px-2.5 text-[10px]">
            {statusLabel(h.status)}
          </Pill>
        </div>
        <span
          className={cn(
            'mt-0.5 block text-[11px] font-semibold',
            h.kmRemaining > 0 ? 'text-muted-foreground' : 'text-danger'
          )}
        >
          {h.kmRemaining > 0
            ? `Sisa ${formatKm(h.kmRemaining)} km`
            : 'Sudah jatuh tempo'}
        </span>
        <div className="mt-2">
          <ProgressBar pct={h.worstPct} tone={h.status === 'ganti' ? 'red' : h.status === 'segera' ? 'amber' : 'lime'} />
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </Card>
  )
}

/** Satu baris riwayat catatan perawatan CVT / Throttle Body */
function CvtLogCard({ log, onDelete }: { log: CvtLogDTO; onDelete: () => void }) {
  const meta = itemsOf(log.kind === 'tb' ? 'tb' : 'cvt').find((i) => i.key === log.item)
  return (
    <Card padded={false} className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/15 text-foreground">
        <ComponentIcon icon={meta?.icon ?? 'cog'} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-foreground">
          {meta?.label ?? log.item}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">
          {formatDate(log.date)} · {formatKm(log.odometer)} km
          {log.cost != null ? ` · Rp${formatRupiah(log.cost)}` : ''}
        </p>
        {log.workshop && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">📍 {log.workshop}</p>
        )}
        {log.note && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            “{log.note}”
          </p>
        )}
      </div>
      <IconBtn
        label="Hapus catatan"
        tone="ghost"
        className="h-9 w-9 shrink-0"
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </IconBtn>
    </Card>
  )
}

// ---------- Sheet: form catat perawatan ----------

function CvtLogSheet({
  open,
  initialKind,
  odometer,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialKind: Tab
  odometer: number
  onClose: () => void
  onSubmit: (data: {
    kind: Tab
    item: string
    odometer: number
    date: string
    cost: number | null
    workshop: string | null
    note: string | null
  }) => Promise<void>
}) {
  const [kind, setKind] = useState<Tab>(initialKind)
  const [item, setItem] = useState<string>(itemsOf(initialKind)[0].key)
  const [km, setKm] = useState('')
  const [date, setDate] = useState('')
  const [cost, setCost] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setKind(initialKind)
      setItem(itemsOf(initialKind)[0].key)
      setKm(String(odometer))
      setDate(todayInput())
      setCost('')
      setWorkshop('')
      setNote('')
    }
  }, [open, initialKind, odometer])

  const switchKind = (k: Tab) => {
    setKind(k)
    setItem(itemsOf(k)[0].key)
  }

  const kmNum = Math.round(Number(km) || 0)
  const overOdo = kmNum > odometer
  const activeItem = itemsOf(kind).find((i) => i.key === item)

  const submit = async () => {
    if (kmNum <= 0) return toast.error('Kilometer wajib diisi')
    if (overOdo) {
      return toast.error(`KM tidak bisa melebihi odometer saat ini (${formatKm(odometer)} km)`)
    }
    setSaving(true)
    try {
      await onSubmit({
        kind,
        item,
        odometer: kmNum,
        date: new Date(`${date}T09:00:00`).toISOString(),
        cost: cost ? Math.round(Number(cost) || 0) : null,
        workshop: workshop.trim() || null,
        note: note.trim() || null,
      })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan catatan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Catat Perawatan" zIndex={60}>
      <div className="flex flex-col gap-4">
        {/* Jenis perawatan */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: 'cvt', label: 'CVT', icon: <Cog size={15} /> },
              { key: 'tb', label: 'Throttle Body', icon: <Gauge size={15} /> },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchKind(t.key)}
              aria-pressed={kind === t.key}
              className={cn(
                'press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border text-sm font-bold',
                kind === t.key
                  ? 'border-lime bg-lime text-on-lime'
                  : 'border-input bg-card text-muted-foreground'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Pekerjaan yang dikerjakan */}
        <Field label="Pekerjaan yang dikerjakan">
          <div className="grid grid-cols-2 gap-2">
            {itemsOf(kind).map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => setItem(i.key)}
                aria-pressed={item === i.key}
                className={cn(
                  'press flex min-h-14 flex-col items-start justify-center gap-1 rounded-2xl border px-3 py-2 text-left',
                  item === i.key
                    ? 'border-lime bg-lime/10'
                    : 'border-input bg-card hover:bg-muted/60'
                )}
              >
                <ComponentIcon icon={i.icon} size={16} />
                <span
                  className={cn(
                    'text-[12px] font-bold leading-tight',
                    item === i.key ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {i.label}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {/* Info sinkronisasi komponen */}
        {activeItem && activeItem.syncs ? (
          <p className="rounded-2xl bg-lime/10 px-4 py-3 text-[11px] font-semibold leading-snug text-foreground">
            ✓ Sisa pakai <span className="font-extrabold">{activeItem.syncs}</span> di halaman
            Perawatan akan otomatis direset mulai km ini.
          </p>
        ) : (
          <p className="rounded-2xl bg-muted/60 px-4 py-3 text-[11px] font-semibold leading-snug text-muted-foreground">
            Perawatan rutin — sisa pakai komponen tidak berubah, catatan tetap tersimpan.
          </p>
        )}

        {/* Kilometer */}
        <Field label="Kilometer saat dikerjakan" hint={`Odometer saat ini: ${formatKm(odometer)} km`}>
          <div className="flex gap-2">
            <input
              className={inputCls}
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="cth. 16000"
              aria-label="Kilometer saat perawatan dikerjakan"
            />
            <button
              type="button"
              onClick={() => setKm(String(odometer))}
              className="press shrink-0 rounded-xl border border-border/70 px-3 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sekarang
            </button>
          </div>
        </Field>
        {overOdo && (
          <p className="-mt-2 px-1 text-[11px] font-bold text-danger">
            KM melebihi odometer saat ini ({formatKm(odometer)} km)
          </p>
        )}

        {/* Tanggal */}
        <Field label="Tanggal">
          <input
            type="date"
            className={inputCls}
            value={date}
            max={todayInput()}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        {/* Biaya & bengkel */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Biaya (Rp)" hint="Opsional">
            <input
              className={inputCls}
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="cth. 100000"
            />
          </Field>
          <Field label="Bengkel" hint="Opsional">
            <input
              className={inputCls}
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              placeholder="cth. Bengkel Matic Jaya"
            />
          </Field>
        </div>

        {/* Catatan */}
        <Field label="Catatan" hint="Opsional, cth. roller 12g, belt genuine">
          <textarea
            className={`${inputCls} min-h-20 py-3`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tulis detail pekerjaan atau sparepart yang dipakai…"
          />
        </Field>

        <Btn variant="lime" full onClick={submit} disabled={saving || kmNum <= 0 || overOdo}>
          {saving ? 'Menyimpan…' : 'Simpan Catatan'}
        </Btn>
      </div>
    </Sheet>
  )
}

// ---------- View utama ----------

export interface CvtGuideViewProps {
  components: ComponentDTO[]
  logs: CvtLogDTO[]
  odometer: number
  onBack: () => void
  onOpenBengkel: () => void
  onOpenDetail: (id: string) => void
  onAddLog: (data: {
    kind: Tab
    item: string
    odometer: number
    date: string
    cost: number | null
    workshop: string | null
    note: string | null
  }) => Promise<void>
  onDeleteLog: (id: string) => void
}

export function CvtGuideView({
  components,
  logs,
  odometer,
  onBack,
  onOpenBengkel,
  onOpenDetail,
  onAddLog,
  onDeleteLog,
}: CvtGuideViewProps) {
  const [tab, setTab] = useState<Tab>('cvt')
  const [logOpen, setLogOpen] = useState(false)

  const related = useMemo(() => {
    const cvtKeys = ['v-belt-cvt', 'roller-cvt', 'tensioner-v-belt']
    const keys = tab === 'cvt' ? cvtKeys : ['throttle-body']
    return components
      .filter((c) => c.installed && c.health && keys.includes(c.key))
      .sort((a, b) => (a.health!.worstPct - b.health!.worstPct)) as Array<
      ComponentDTO & { health: NonNullable<ComponentDTO['health']> }
    >
  }, [components, tab])

  const tabLogs = useMemo(() => logs.filter((l) => (l.kind === 'tb' ? 'tb' : 'cvt') === tab), [logs, tab])

  return (
    <div className="pb-6">
      {/* Header */}
      <header className="px-4 pb-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke Perawatan"
          className="press mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-center text-xl font-extrabold text-foreground">
          Perawatan CVT & Throttle Body
        </h1>
        <p className="mt-0.5 text-center text-xs text-muted-foreground">
          Panduan lengkap & pencatatan perawatan transmisi matic + injeksi
        </p>
      </header>

      {/* Tab terpisah: CVT / Throttle Body */}
      <div className="mx-4 mb-4 grid grid-cols-2 gap-1 rounded-full border border-border/70 bg-card p-1">
        {(
          [
            { key: 'cvt', label: 'CVT', icon: <Cog size={15} /> },
            { key: 'tb', label: 'Throttle Body', icon: <Gauge size={15} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              'press flex min-h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-extrabold transition-colors',
              tab === t.key ? 'bg-lime text-on-lime' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------- CTA: Mulai Catat Perawatan ---------- */}
      <motion.section {...fade} className="px-4" aria-label="Mulai catat perawatan">
        <div className="rounded-[26px] bg-ink p-5 text-background shadow-[0_6px_20px_rgba(16,17,16,0.18)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-on-lime">
              <NotebookPen size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold leading-tight">Mulai Catat Perawatan</p>
              <p className="mt-0.5 text-[12px] font-semibold opacity-70">
                {tab === 'cvt'
                  ? 'Bersih rumah CVT, ganti roller, v-belt, oli gardan'
                  : 'Bersih throttle body, ganti filter udara'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              aria-label="Buka form catat perawatan"
              className="press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-lime px-4 text-[13px] font-extrabold text-on-lime"
            >
              <Plus size={16} /> Catat
            </button>
          </div>
        </div>
      </motion.section>

      {/* ---------- Riwayat catatan perawatan ---------- */}
      <motion.section {...fade} className="mt-5 px-4" aria-label="Riwayat catatan perawatan">
        <SectionTitle title="Riwayat Catatan" />
        {tabLogs.length === 0 ? (
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="press flex w-full flex-col items-center gap-2 rounded-[26px] border border-dashed border-border bg-card/50 px-6 py-7 text-center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <NotebookPen size={18} />
            </span>
            <p className="text-[13px] font-extrabold text-foreground">
              Belum ada catatan {tab === 'cvt' ? 'CVT' : 'Throttle Body'}
            </p>
            <p className="max-w-[260px] text-[12px] leading-snug text-muted-foreground">
              Ketuk di sini untuk mencatat perawatan {tab === 'cvt' ? 'CVT' : 'throttle body'} yang
              baru dikerjakan.
            </p>
          </button>
        ) : (
          <div className="no-scrollbar max-h-96 space-y-2.5 overflow-y-auto pr-0.5">
            {tabLogs.map((l) => (
              <CvtLogCard
                key={l.id}
                log={l}
                onDelete={() => {
                  if (window.confirm('Hapus catatan perawatan ini?')) onDeleteLog(l.id)
                }}
              />
            ))}
            {tabLogs.length >= 8 && (
              <p className="px-1 text-center text-[11px] font-semibold text-muted-foreground">
                Menampilkan {tabLogs.length} catatan terakhir
              </p>
            )}
          </div>
        )}
      </motion.section>

      {tab === 'cvt' ? (
        <div className="mt-6 space-y-6 px-4">
          {/* Pengantar CVT */}
          <motion.section {...fade} aria-label="Tentang CVT">
            <div className="rounded-[28px] bg-lime p-5 text-on-lime">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-lime/10">
                  <Sparkles size={18} />
                </span>
                <p className="text-[15px] font-extrabold leading-tight">Apa itu CVT?</p>
              </div>
              <p className="mt-3 text-[13px] font-semibold leading-relaxed opacity-90">
                CVT (Continuously Variable Transmission) adalah jantung transmisi motor matic di
                badan tengah — meneruskan tenaga mesin ke roda belakang lewat V-Belt dan roller.
                Bagian ini paling sering bekerja, jadi wajib dirawat rutin agar tarikan tetap
                halus dan tidak menyebabkan kerusakan mahal.
              </p>
            </div>
          </motion.section>

          {/* Jadwal */}
          <motion.section {...fade}>
            <GuideSection icon={<CalendarClock size={15} />} title="Jadwal Perawatan CVT">
              <div className="grid grid-cols-2 gap-3">
                {CVT_SCHEDULE.map((s) => (
                  <ScheduleTile key={s.title} icon={s.icon} title={s.title} km={s.km} note={s.note} />
                ))}
              </div>
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                *Interval umum motor matic — ikuti buku manual motormu bila berbeda.
              </p>
            </GuideSection>
          </motion.section>

          {/* Langkah servis */}
          <motion.section {...fade}>
            <GuideSection icon={<Wrench size={15} />} title="Yang Dikerjakan Saat Servis CVT">
              <Card className="p-5">
                <ol className="space-y-3">
                  {CVT_STEPS.map((s, i) => (
                    <StepRow key={s} index={i + 1} text={s} />
                  ))}
                </ol>
              </Card>
            </GuideSection>
          </motion.section>

          {/* Tanda masalah */}
          <motion.section {...fade}>
            <GuideSection icon={<AlertTriangle size={15} />} title="Tanda CVT Bermasalah">
              <Card className="p-5">
                <ul className="space-y-3">
                  {CVT_SYMPTOMS.map((s) => (
                    <InfoRow key={s} tone="warn" icon={<AlertTriangle size={13} />} text={s} />
                  ))}
                </ul>
              </Card>
            </GuideSection>
          </motion.section>

          {/* Tips */}
          <motion.section {...fade}>
            <GuideSection icon={<Lightbulb size={15} />} title="Tips Menjaga CVT">
              <Card className="p-5">
                <ul className="space-y-3">
                  {CVT_TIPS.map((s) => (
                    <InfoRow key={s} tone="tip" icon={<CheckCircle2 size={13} />} text={s} />
                  ))}
                </ul>
              </Card>
            </GuideSection>
          </motion.section>

          {/* Estimasi biaya */}
          <motion.section {...fade}>
            <Card className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <Banknote size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-foreground">Estimasi biaya servis CVT</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Bengkel umum ± Rp 75–150 ribu (bersih + cek roller). Bengkel resmi ± Rp 150–300
                  ribu. Belum termasuk ganti V-Belt / roller — kisaran bisa berbeda tiap daerah.
                </p>
              </div>
            </Card>
          </motion.section>
        </div>
      ) : (
        <div className="mt-6 space-y-6 px-4">
          {/* Pengantar Throttle Body */}
          <motion.section {...fade} aria-label="Tentang Throttle Body">
            <div className="rounded-[28px] bg-lime p-5 text-on-lime">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-lime/10">
                  <Sparkles size={18} />
                </span>
                <p className="text-[15px] font-extrabold leading-tight">Apa itu Throttle Body?</p>
              </div>
              <p className="mt-3 text-[13px] font-semibold leading-relaxed opacity-90">
                Throttle body adalah "gerbang udara" motor injeksi — mengatur berapa banyak udara
                masuk ke ruang bakar sesuai putaran gas. Jika kotor tersumbat carbon, campuran
                bahan bakar jadi tidak pas: idle kacau, tarikan tersendat, dan bensin boros.
              </p>
            </div>
          </motion.section>

          {/* Jadwal */}
          <motion.section {...fade}>
            <GuideSection icon={<CalendarClock size={15} />} title="Jadwal Pembersihan">
              <div className="grid grid-cols-2 gap-3">
                <ScheduleTile
                  icon="gauge"
                  title="Bersih Throttle Body"
                  km={16000}
                  note="Setiap 16.000 km atau 12 bulan"
                />
                <ScheduleTile
                  icon="wind"
                  title="Filter Udara"
                  km={8000}
                  note="Cek tiap servis — kotor mempercepat TB kotor"
                />
              </div>
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                *Dipersingkat bila sering melewati jalan berdebu atau macet parah setiap hari.
              </p>
            </GuideSection>
          </motion.section>

          {/* Tanda masalah */}
          <motion.section {...fade}>
            <GuideSection icon={<AlertTriangle size={15} />} title="Tanda Throttle Body Kotor">
              <Card className="p-5">
                <ul className="space-y-3">
                  {TB_SYMPTOMS.map((s) => (
                    <InfoRow key={s} tone="warn" icon={<AlertTriangle size={13} />} text={s} />
                  ))}
                </ul>
              </Card>
            </GuideSection>
          </motion.section>

          {/* Langkah pembersihan */}
          <motion.section {...fade}>
            <GuideSection icon={<Wrench size={15} />} title="Yang Dikerjakan Saat Pembersihan">
              <Card className="p-5">
                <ol className="space-y-3">
                  {TB_STEPS.map((s, i) => (
                    <StepRow key={s} index={i + 1} text={s} />
                  ))}
                </ol>
              </Card>
            </GuideSection>
          </motion.section>

          {/* Peringatan */}
          <motion.section {...fade}>
            <div className="flex items-start gap-2.5 rounded-2xl bg-warn/10 p-4 ring-1 ring-warn/30">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
              <div className="text-[12px] leading-relaxed text-warn">
                <p className="font-bold">Penting — jangan bongkar sembarangan</p>
                <p className="mt-1">
                  Throttle body punya sensor presisi (TPS/MAPE). Jangan digosok atau disemprot
                  sembarangan, dan setelah dibersihkan wajib dikalibrasi lewat scanner. Salah
                  penanganan bisa bikin idle error atau lampu FI menyala.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Tips */}
          <motion.section {...fade}>
            <GuideSection icon={<Lightbulb size={15} />} title="Tips Menjaga Throttle Body">
              <Card className="p-5">
                <ul className="space-y-3">
                  {TB_TIPS.map((s) => (
                    <InfoRow key={s} tone="tip" icon={<CheckCircle2 size={13} />} text={s} />
                  ))}
                </ul>
              </Card>
            </GuideSection>
          </motion.section>

          {/* Estimasi biaya */}
          <motion.section {...fade}>
            <Card className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <Banknote size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-foreground">Estimasi biaya bersih throttle body</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Bengkel umum ± Rp 50–150 ribu. Bengkel resmi bisa lebih — biasanya sudah termasuk
                  kalibrasi scanner. Kisaran berbeda tiap daerah dan tipe motor.
                </p>
              </div>
            </Card>
          </motion.section>
        </div>
      )}

      {/* Kondisi komponen terkait (data nyata motor pengguna) */}
      {related.length > 0 && (
        <motion.section {...fade} className="mt-6 px-4">
          <SectionTitle title="Kondisi Komponen Terkait" />
          <div className="space-y-3">
            {related.map((c) => (
              <RelatedComponentCard key={c.id} c={c} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        </motion.section>
      )}

      {/* CTA bengkel */}
      <motion.div {...fade} className="mt-6 px-4">
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-on-lime">
            <MapPin size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-foreground">
              {tab === 'cvt' ? 'Waktunya servis CVT?' : 'Throttle body mulai kasar?'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {tab === 'cvt'
                ? 'Cari bengkel matic terdekat yang terbiasa bongkar CVT'
                : 'Cari bengkel injeksi yang punya scanner kalibrasi'}
            </p>
          </div>
          <IconBtn label="Temukan bengkel" tone="lime" onClick={onOpenBengkel}>
            <ChevronRight size={18} />
          </IconBtn>
        </Card>
      </motion.div>

      {/* Footer catatan */}
      <p className="mt-5 px-8 text-center text-[11px] leading-relaxed text-muted-foreground">
        Panduan ini bersifat umum untuk motor matic injeksi. Selalu ikuti buku manual dan
        rekomendasi pabrikan motormu.
      </p>

      {/* Sheet form catat perawatan */}
      <CvtLogSheet
        open={logOpen}
        initialKind={tab}
        odometer={odometer}
        onClose={() => setLogOpen(false)}
        onSubmit={onAddLog}
      />

      {/* Bantalan bawah agar tidak tertutup nav */}
      <div className="h-4" aria-hidden="true" />
    </div>
  )
}

