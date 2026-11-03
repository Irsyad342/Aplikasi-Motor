'use client'

import { motion } from 'framer-motion'
import { Bike, House, Route, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export type View = 'home' | 'ride' | 'maint' | 'vehicle' | 'history' | 'bengkel' | 'settings'

const ITEMS = [
  { key: 'home', label: 'Beranda', icon: House },
  { key: 'ride', label: 'Perjalanan', icon: Route },
  { key: 'maint', label: 'Perawatan', icon: Wrench },
  { key: 'vehicle', label: 'Motor', icon: Bike },
] as const

export type NavKey = (typeof ITEMS)[number]['key']

export function BottomNav({
  view,
  onChange,
}: {
  view: View
  onChange: (v: View) => void
}) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
    >
      <div className="pointer-events-auto mb-4 flex items-center gap-1 rounded-full border border-border/60 bg-card/95 p-1.5 shadow-[0_8px_30px_rgba(16,17,16,0.14)] backdrop-blur-md">
        {ITEMS.map((it) => {
          const active = view === it.key
          const Icon = it.icon
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              aria-label={it.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'press relative flex min-h-12 items-center gap-1.5 rounded-full px-4 text-[12px] font-bold',
                active ? 'text-on-lime' : 'text-muted-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                  className="absolute inset-0 rounded-full bg-lime"
                />
              )}
              <Icon size={18} className="relative z-10" strokeWidth={active ? 2.4 : 2} />
              <span className="relative z-10 hidden min-[400px]:inline">{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
