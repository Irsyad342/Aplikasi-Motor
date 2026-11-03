'use client'

/**
 * RideCheck UI Kit — design tokens "Neon Lime"
 * Kartu rounded-3xl (24-28px), pill status, tombol bulat, angka statistik besar,
 * grafik minimalis beraksen lime. Semua warna lewat token tema (light/dark).
 */

import { type ReactNode, type ButtonHTMLAttributes, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ComponentStatus } from '@/lib/status'

// ---------- Tipe bersama ----------

export type QuickAction = 'trip' | 'service' | 'expense' | 'history' | 'odometer'

export interface TrackingState {
  startedAt: number
  distance: number
  geoFixes: number
}

// ---------- Format ----------

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(n))
}

// ---------- Kartu ----------

export function Card({
  children,
  className,
  onClick,
  padded = true,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  padded?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'rounded-[26px] border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgba(16,17,16,0.04)]',
        onClick && 'press w-full text-left transition-colors hover:border-foreground/20',
        padded && 'p-5',
        className
      )}
    >
      {children}
    </Tag>
  )
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="text-[15px] font-extrabold tracking-tight text-foreground">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="press text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {action}
        </button>
      )}
    </div>
  )
}

// ---------- Pill status ----------

type PillTone = 'lime' | 'amber' | 'red' | 'gray' | 'dark' | 'outline'

export function Pill({
  children,
  tone = 'gray',
  className,
}: {
  children: ReactNode
  tone?: PillTone
  className?: string
}) {
  const tones: Record<PillTone, string> = {
    lime: 'bg-lime text-ink',
    amber: 'bg-warn/15 text-warn',
    red: 'bg-danger/10 text-danger',
    gray: 'bg-muted text-muted-foreground',
    dark: 'bg-ink text-background',
    outline: 'border border-border bg-transparent text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold leading-none',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusTone(s: ComponentStatus): PillTone {
  return s === 'ganti' ? 'red' : s === 'segera' ? 'amber' : 'lime'
}

// ---------- Tombol ----------

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'dark' | 'lime' | 'outline' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  full?: boolean
}

export function Btn({ variant = 'dark', size = 'md', full, className, children, ...rest }: BtnProps) {
  const variants = {
    dark: 'bg-primary text-primary-foreground hover:opacity-90',
    lime: 'bg-lime text-ink hover:brightness-105',
    outline: 'border border-border bg-card text-foreground hover:bg-muted',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground',
    danger: 'bg-danger/10 text-danger hover:bg-danger/20',
  }
  return (
    <button
      {...rest}
      className={cn(
        'press inline-flex items-center justify-center gap-2 rounded-full font-bold',
        size === 'md' ? 'min-h-11 px-5 text-sm' : 'min-h-9 px-4 text-[13px]',
        full && 'w-full',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  children,
  onClick,
  label,
  tone = 'card',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  label: string
  tone?: 'card' | 'dark' | 'lime' | 'ghost'
  className?: string
}) {
  const tones = {
    card: 'bg-card text-foreground border border-border/70 shadow-sm',
    dark: 'bg-ink text-background',
    lime: 'bg-lime text-ink',
    ghost: 'text-muted-foreground hover:text-foreground',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'press flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        tones[tone],
        className
      )}
    >
      {children}
    </button>
  )
}

// ---------- Statistik ----------

export function StatCard({
  icon,
  label,
  value,
  unit,
  className,
}: {
  icon?: ReactNode
  label: string
  value: string | number
  unit?: string
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div>
        <div className="stat-num text-[26px] leading-none text-foreground">
          {value}
          {unit && <span className="ml-1 text-sm font-bold text-muted-foreground">{unit}</span>}
        </div>
        <div className="mt-1.5 text-[12px] font-semibold text-muted-foreground">{label}</div>
      </div>
    </Card>
  )
}

/** Tile highlight kecil di dalam kartu hero — info ringkas yang membantu user. */
export function HighlightTile({
  label,
  value,
  sub,
  dot,
  onClick,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  /** Titik status berwarna di samping label */
  dot?: 'lime' | 'amber' | 'red' | null
  onClick?: () => void
  className?: string
}) {
  const dotCls =
    dot === 'red' ? 'bg-danger' : dot === 'amber' ? 'bg-warn' : dot === 'lime' ? 'bg-lime' : null
  const Tag = (onClick ? 'button' : 'div') as 'button'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'min-w-0 rounded-[18px] bg-muted/70 px-3 py-2.5 text-left',
        onClick && 'press transition-colors hover:bg-muted',
        className
      )}
    >
      <span className="flex items-center gap-1.5">
        {dotCls && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotCls)} />}
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </span>
      <span className="mt-1 block truncate text-[13px] font-extrabold leading-tight text-foreground">
        {value}
      </span>
      {sub && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{sub}</span>}
    </Tag>
  )
}

// ---------- Progress ----------

export function ProgressBar({
  pct,
  tone = 'lime',
  className,
}: {
  pct: number // 0..1
  tone?: 'lime' | 'amber' | 'red'
  className?: string
}) {
  const p = Math.max(0, Math.min(1, pct))
  const colors = { lime: 'bg-lime', amber: 'bg-warn', red: 'bg-danger' }
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${p * 100}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn('h-full rounded-full', colors[tone])}
      />
    </div>
  )
}

// ---------- Empty state ----------

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode
  title: string
  desc: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[26px] border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-extrabold text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-snug text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  )
}

// ---------- Form fields ----------

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-[12px] font-bold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="px-1 text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'min-h-11 w-full rounded-2xl border border-input bg-card px-4 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50'

export const selectCls = cn(inputCls, 'appearance-none pr-10')

// ---------- Grafik (SVG, tanpa dependensi) ----------

export interface ChartPoint {
  label: string
  value: number
}

function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = x1 + (x2 - x0) / 6
    const cp1y = y1 + (y2 - y0) / 6
    const cp2x = x2 - (x3 - x1) / 6
    const cp2y = y2 - (y3 - y1) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`
  }
  return d
}

/** Grafik garis area — perkembangan nilai per periode, aksen lime */
export function LimeLineChart({
  data,
  height = 150,
  unit = '',
}: {
  data: ChartPoint[]
  height?: number
  unit?: string
}) {
  const W = 320
  const H = height
  const P = { t: 14, r: 8, b: 22, l: 8 }
  const id = useMemo(() => `lg${Math.random().toString(36).slice(2, 8)}`, [])
  const max = Math.max(...data.map((d) => d.value), 1)
  const pts = data.map(
    (d, i) =>
      [
        P.l + (i / Math.max(1, data.length - 1)) * (W - P.l - P.r),
        P.t + (1 - d.value / max) * (H - P.t - P.b),
      ] as [number, number]
  )
  const line = smoothPath(pts)
  const area = line ? `${line} L ${pts[pts.length - 1][0]},${H - P.b} L ${pts[0][0]},${H - P.b} Z` : ''
  const last = pts[pts.length - 1]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik garis">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {line && (
          <>
            <path d={area} fill={`url(#${id})`} />
            <motion.path
              d={line}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            {last && <circle cx={last[0]} cy={last[1]} r="4" fill="var(--chart-1)" stroke="var(--card)" strokeWidth="2" />}
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] font-bold text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className={cn(data.length > 6 && i % 2 === 1 && 'invisible')}>
            {d.label}
          </span>
        ))}
      </div>
      <p className="mt-1 px-1 text-[11px] font-semibold text-muted-foreground">
        Maksimum: <span className="stat-num text-foreground">{max.toLocaleString('id-ID')}</span> {unit}
      </p>
    </div>
  )
}

/** Grafik batang minimalis — batang tertinggi disorot lime */
export function LimeBarChart({
  data,
  height = 150,
  unit = '',
}: {
  data: ChartPoint[]
  height?: number
  unit?: string
}) {
  const W = 320
  const H = height
  const P = { t: 16, b: 22 }
  const max = Math.max(...data.map((d) => d.value), 1)
  const maxIdx = data.reduce((mi, d, i) => (d.value > (data[mi]?.value ?? 0) ? i : mi), 0)
  const bw = (W - 16) / Math.max(1, data.length)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik batang">
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * (H - P.t - P.b))
          const x = 8 + i * bw + bw * 0.18
          const y = H - P.b - h
          const hi = i === maxIdx && d.value > 0
          return (
            <motion.rect
              key={i}
              x={x}
              width={bw * 0.64}
              rx={5}
              fill={hi ? 'var(--chart-1)' : 'var(--chart-5)'}
              fillOpacity={hi ? 1 : 0.35}
              initial={{ y: H - P.b, height: 0 }}
              animate={{ y, height: h }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          )
        })}
      </svg>
      <div className="mt-1 flex px-1 text-[10px] font-bold text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} style={{ width: `${100 / data.length}%` }} className="text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- Sheet / modal bawah ----------

export function Sheet({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-[430px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className={cn(
          'relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-card pb-safe sm:rounded-[28px]',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h3 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h3>
          <IconBtn label="Tutup" tone="ghost" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </IconBtn>
        </div>
        <div className="no-scrollbar overflow-y-auto px-5 pb-6">{children}</div>
      </motion.div>
    </div>
  )
}

// ---------- Konfirmasi ----------

export function ConfirmRow({
  title,
  desc,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string
  desc: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <Card className="border-danger/30 bg-danger/5">
      <p className="text-sm font-extrabold text-foreground">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{desc}</p>
      <div className="mt-4 flex gap-2">
        <Btn variant="outline" size="sm" onClick={onCancel} className="flex-1">
          Batal
        </Btn>
        <Btn variant={danger ? 'danger' : 'dark'} size="sm" onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Btn>
      </div>
    </Card>
  )
}
