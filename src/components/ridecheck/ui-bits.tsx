'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComponentIcon } from './icons'
import { formatKm, formatMonthYear, statusLabel, type ComponentStatus } from '@/lib/status'
import type { ComponentDTO } from '@/lib/state'

// Warna status
export const STATUS_STYLES: Record<
  ComponentStatus,
  { text: string; icon: string; badge: string; dot: string; range: string }
> = {
  ganti: {
    text: 'text-red-600',
    icon: 'text-zinc-300',
    badge: 'bg-red-100 text-red-600',
    dot: 'bg-red-500',
    range: '#ef4444',
  },
  segera: {
    text: 'text-amber-600',
    icon: 'text-amber-400',
    badge: 'bg-amber-100 text-amber-600',
    dot: 'bg-amber-400',
    range: '#f59e0b',
  },
  sehat: {
    text: 'text-green-600',
    icon: 'text-green-500',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    range: '#22c55e',
  },
}

export function StatusBadge({ status }: { status: ComponentStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        s.badge
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {statusLabel(status)}
    </span>
  )
}

export function ComponentCard({
  component,
  onSelect,
  selectMode,
  selected,
  onToggleSelect,
}: {
  component: ComponentDTO
  onSelect?: (c: ComponentDTO) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (c: ComponentDTO) => void
}) {
  const h = component.health
  const status = h?.status ?? 'sehat'
  const s = STATUS_STYLES[status]
  return (
    <button
      type="button"
      onClick={() => (selectMode ? onToggleSelect?.(component) : onSelect?.(component))}
      className={cn(
        'relative flex w-full flex-col items-center gap-1.5 rounded-3xl bg-white p-4 pt-3 text-center shadow-sm transition-transform active:scale-[0.97]',
        selectMode && selected && 'ring-2 ring-sky-500'
      )}
    >
      {selectMode && (
        <span
          className={cn(
            'absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border text-white',
            selected ? 'border-sky-500 bg-sky-500' : 'border-zinc-300 bg-white'
          )}
        >
          {selected && (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5}>
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}
      <span className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-tight text-zinc-800">
        {component.name}
      </span>
      <ComponentIcon icon={component.icon} size={42} className={cn('my-1', s.icon)} />
      {h ? (
        <>
          <span className="text-[13px] font-bold text-zinc-800">
            Sisa {formatKm(h.kmRemaining)} km
          </span>
          <span className="text-[11px] text-zinc-400">est. {formatMonthYear(h.estDate)}</span>
        </>
      ) : (
        <span className="mt-2 text-[11px] text-zinc-400">Ketuk untuk Menambah</span>
      )}
    </button>
  )
}

export function ManageCard({
  component,
  onSelect,
}: {
  component: ComponentDTO
  onSelect: (c: ComponentDTO) => void
}) {
  const installed = component.installed
  return (
    <button
      type="button"
      onClick={() => onSelect(component)}
      className={cn(
        'flex w-full flex-col items-center gap-1.5 rounded-3xl p-4 pt-3 text-center transition-transform active:scale-[0.97]',
        installed ? 'bg-white shadow-sm' : 'bg-white/45'
      )}
    >
      <span
        className={cn(
          'line-clamp-2 min-h-9 text-[13px] font-semibold leading-tight',
          installed ? 'text-zinc-800' : 'text-zinc-400'
        )}
      >
        {component.name}
      </span>
      <ComponentIcon
        icon={component.icon}
        size={42}
        className={cn('my-1', installed ? 'text-zinc-400' : 'text-zinc-200')}
      />
      <span className={cn('mt-2 text-[11px]', installed ? 'text-zinc-500' : 'text-zinc-400')}>
        {installed ? 'Ketuk untuk Mengatur' : 'Ketuk untuk Menambah'}
      </span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex rounded-full bg-zinc-200/70 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-full py-2 text-sm transition-all',
            value === o.value
              ? 'bg-white font-bold text-zinc-900 shadow-sm'
              : 'font-medium text-zinc-500'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Bottom sheet bergaya mobile
export function BottomSheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            className="relative max-h-[85%] overflow-y-auto rounded-t-[28px] bg-white pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[28px] bg-white px-5 pb-3 pt-4">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-zinc-200" />
              <h3 className="mt-2 text-lg font-bold">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>
  title: string
  description: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-8 pt-16 text-center', className)}>
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-100">
        <Icon size={44} className="text-zinc-300" />
      </div>
      <h3 className="text-xl font-bold text-zinc-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
    </div>
  )
}
