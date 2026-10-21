'use client'

import { Bike, Clock, Map, Search, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export type View = 'kendaraan' | 'perjalanan' | 'riwayat' | 'bengkel'

const NAV_ITEMS: Array<{ value: View; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { value: 'kendaraan', label: 'Kendaraan', icon: Bike },
  { value: 'perjalanan', label: 'Perjalanan', icon: Map },
  { value: 'riwayat', label: 'Riwayat', icon: Clock },
  { value: 'bengkel', label: 'Bengkel', icon: Wrench },
]

export function BottomNav({
  view,
  onChange,
  onSearch,
}: {
  view: View
  onChange: (v: View) => void
  onSearch: () => void
}) {
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      aria-label="Navigasi utama"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex flex-1 items-center justify-around rounded-full bg-white px-1.5 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {NAV_ITEMS.map((item) => {
            const active = view === item.value
            const Icon = item.icon
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.value)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 transition-colors',
                  active ? 'bg-zinc-100 text-sky-600' : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onSearch}
          aria-label="Cari"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-transform active:scale-95"
        >
          <Search size={20} />
        </button>
      </div>
    </nav>
  )
}
