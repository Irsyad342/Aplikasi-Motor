'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Map, Bike, CarFront, Clock } from 'lucide-react'
import type { AppState } from '@/lib/state'
import type { Bengkel } from '@/lib/bengkel'
import { cn } from '@/lib/utils'
import { formatDate, formatKm, formatKm1, statusLabel } from '@/lib/status'
import { ComponentIcon } from './icons'

export function SearchOverlay({
  state,
  bengkel,
  onClose,
  onOpenDetail,
  onGoTo,
  onSwitchVehicle,
}: {
  state: AppState
  bengkel: Bengkel[]
  onClose: () => void
  onOpenDetail: (componentId: string) => void
  onGoTo: (v: 'bengkel' | 'riwayat' | 'perjalanan') => void
  onSwitchVehicle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const q = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!q) return null
    return {
      components: state.components.filter(
        (c) => c.installed && c.name.toLowerCase().includes(q)
      ),
      vehicles: state.vehicles.filter((v) => v.name.toLowerCase().includes(q)),
      bengkel: bengkel.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.brand.toLowerCase().includes(q) ||
          b.services.some((s) => s.toLowerCase().includes(q))
      ),
      records: state.records.filter(
        (r) => r.componentName.toLowerCase().includes(q) || r.type.includes(q)
      ),
      trips: state.trips.filter((t) => formatDate(t.startedAt).toLowerCase().includes(q)),
    }
  }, [q, state, bengkel])

  const hasAny =
    results &&
    (results.components.length > 0 ||
      results.vehicles.length > 0 ||
      results.bengkel.length > 0 ||
      results.records.length > 0 ||
      results.trips.length > 0)

  const urgent = state.components
    .filter((c) => c.installed && c.health && c.health.status !== 'sehat')
    .sort((a, b) => a.health!.worstPct - b.health!.worstPct)

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col bg-background"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Kembali"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted/60"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari komponen, bengkel, riwayat…"
            className="w-full rounded-full bg-card py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-2">
        {!results ? (
          <div className="space-y-5">
            {urgent.length > 0 && (
              <div>
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Perlu perhatian
                </h3>
                <div className="space-y-1.5">
                  {urgent.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpenDetail(c.id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left shadow-sm"
                    >
                      <ComponentIcon icon={c.icon} size={20} className="text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {c.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Sisa {formatKm(c.health!.kmRemaining)} km
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {statusLabel(c.health!.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="px-1 text-xs text-muted-foreground">
              Ketik untuk mencari komponen, kendaraan, bengkel, dan riwayat.
            </p>
          </div>
        ) : !hasAny ? (
          <div className="pt-16 text-center">
            <Search size={40} className="mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              Tidak ada hasil untuk “{query}”
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {results.components.length > 0 && (
              <Group title="Komponen">
                {results.components.map((c) => (
                  <RowButton
                    key={c.id}
                    onClick={() => onOpenDetail(c.id)}
                    icon={<ComponentIcon icon={c.icon} size={19} className="text-muted-foreground" />}
                    title={c.name}
                    subtitle={
                      c.health
                        ? `Sisa ${formatKm(c.health.kmRemaining)} km · ${statusLabel(c.health.status)}`
                        : 'Belum terpasang'
                    }
                  />
                ))}
              </Group>
            )}
            {results.vehicles.length > 0 && (
              <Group title="Kendaraan">
                {results.vehicles.map((v) => (
                  <RowButton
                    key={v.id}
                    onClick={() => onSwitchVehicle(v.id)}
                    icon={
                      v.type === 'mobil' ? (
                        <CarFront size={19} className="text-muted-foreground" />
                      ) : (
                        <Bike size={19} className="text-muted-foreground" />
                      )
                    }
                    title={v.name}
                    subtitle={`${formatKm(v.odometer)} km`}
                  />
                ))}
              </Group>
            )}
            {results.bengkel.length > 0 && (
              <Group title={`Bengkel (${results.bengkel.length} di seluruh Indonesia)`}>
                {results.bengkel.slice(0, 6).map((b) => (
                  <RowButton
                    key={b.id}
                    onClick={() => onGoTo('bengkel')}
                    accent
                    icon={<Map size={19} />}
                    title={b.name}
                    subtitle={`${b.brand} · ${b.city}`}
                  />
                ))}
              </Group>
            )}
            {results.records.length > 0 && (
              <Group title="Riwayat Servis">
                {results.records.map((r) => (
                  <RowButton
                    key={r.id}
                    onClick={() => onOpenDetail(r.componentId)}
                    icon={<ComponentIcon icon={r.componentIcon} size={19} className="text-muted-foreground" />}
                    title={`${r.type === 'ganti' ? 'Ganti' : 'Servis'} ${r.componentName}`}
                    subtitle={`${formatKm(r.odometer)} km · ${formatDate(r.date)}`}
                  />
                ))}
              </Group>
            )}
            {results.trips.length > 0 && (
              <Group title="Perjalanan">
                {results.trips.map((t) => (
                  <RowButton
                    key={t.id}
                    onClick={() => onGoTo('perjalanan')}
                    accent
                    icon={<Clock size={19} />}
                    title={`Perjalanan ${formatKm1(t.distance)} km`}
                    subtitle={formatDate(t.startedAt)}
                  />
                ))}
              </Group>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function RowButton({
  onClick,
  icon,
  title,
  subtitle,
  accent,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  /** Aksen lime untuk hasil yang ditonjolkan */
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left shadow-sm active:scale-[0.99]"
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          accent ? 'bg-lime text-ink' : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  )
}
