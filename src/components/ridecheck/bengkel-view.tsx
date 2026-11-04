'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Navigation, Phone, Search, Star, Wrench, Map as MapIcon,
  List, LocateFixed, ChevronDown, X, MapPin, AlertTriangle, RefreshCw, WifiOff, ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_LOCATION, formatDistance, type LatLng } from '@/lib/geo'
import { useLocation } from '@/lib/use-location'
import { fetchLiveBengkel } from '@/lib/overpass'
import {
  BENGKEL_LIST, CITY_LIST, distanceFrom, gmapsDirectionUrl, isOpenNow, isInJava,
  type Bengkel,
} from '@/lib/bengkel'
import { BengkelMap } from './maps'

type Filter = 'semua' | 'resmi' | 'umum'
type Mode = 'peta' | 'daftar'

const RADII = [2, 5, 10, 25, 50]

/** blok masuk dengan fade + naik halus */
function FadeUp({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function BengkelView({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<Mode>('daftar')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')
  const [radiusKm, setRadiusKm] = useState(10)
  const [activeCity, setActiveCity] = useState<string | null>(null) // null = terdekat dari posisi
  const [cityListOpen, setCityListOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fetchNonce, setFetchNonce] = useState(0) // pemicu fetch ulang manual
  const [gpsWaitOver, setGpsWaitOver] = useState(false)

  // Data bengkel
  const [data, setData] = useState<Bengkel[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false) // true = data live OpenStreetMap

  // GPS asli (tidak diam-diam fallback ke Jakarta)
  const loc = useLocation()
  const abortRef = useRef<AbortController | null>(null)

  // Titik acuan: pilih kota > posisi GPS/cache > default
  const userPos = loc.pos
  const outsideJava = !!userPos && !isInJava(userPos.lat, userPos.lng)

  const refPoint: LatLng = useMemo(() => {
    if (activeCity) {
      const c = CITY_LIST.find((x) => x.city === activeCity)
      if (c) return { lat: c.lat, lng: c.lng }
    }
    // posisi pengguna dipakai bila ada dan di dalam Jawa
    if (userPos && isInJava(userPos.lat, userPos.lng)) return userPos
    return DEFAULT_LOCATION
  }, [activeCity, userPos])

  // Beri waktu GPS mendeteksi posisi maks. 7 detik sebelum memakai titik default
  useEffect(() => {
    const t = setTimeout(() => setGpsWaitOver(true), 7000)
    return () => clearTimeout(t)
  }, [])

  // Muat data live setiap titik acuan / radius berubah
  useEffect(() => {
    // tunggu GPS selesai mendeteksi dulu — hindari fetch salah titik Jakarta
    if (!activeCity && !userPos && loc.status === 'locating' && !gpsWaitOver) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state saat parameter pencarian berubah
    setLoading(true)
    setSelectedId(null)

    fetchLiveBengkel(refPoint.lat, refPoint.lng, radiusKm, { signal: ctrl.signal })
      .then(({ list }) => {
        if (ctrl.signal.aborted) return
        setLive(true)
        setData(list)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
        // fallback ke dataset demo (hanya Pulau Jawa)
        setLive(false)
        setData(null)
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [refPoint.lat, refPoint.lng, radiusKm, loc.status, gpsWaitOver, fetchNonce, activeCity, userPos])

  const source: Bengkel[] = useMemo(() => {
    if (live && data) return data
    // fallback demo: batasi sekitar titik acuan sesuai radius
    return BENGKEL_LIST.map((b) => ({ b, d: distanceFrom(b, refPoint) }))
      .filter(({ d }) => d <= Math.max(radiusKm, 30))
      .sort((a, b) => a.d - b.d)
      .map(({ b }) => b)
  }, [live, data, refPoint, radiusKm])

  const refLabel = activeCity
    ? activeCity
    : userPos && isInJava(userPos.lat, userPos.lng)
      ? 'lokasimu sekarang'
      : loc.status === 'denied' || loc.status === 'unavailable'
        ? 'peta Pulau Jawa'
        : 'Jakarta (pusat peta Jawa)'

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = source.map((b) => ({ b, d: distanceFrom(b, refPoint) }))
    if (q) {
      list = list.filter(
        ({ b }) =>
          b.name.toLowerCase().includes(q) ||
          b.brand.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          b.province.toLowerCase().includes(q)
      )
    }
    return list
      .filter(({ b }) => (filter === 'semua' ? true : b.type === filter))
      .sort((a, b) => a.d - b.d || b.b.name.localeCompare(a.b.name) * -1)
  }, [source, query, filter, refPoint])

  const selected = useMemo(
    () => shown.find(({ b }) => b.id === selectedId)?.b ?? null,
    [shown, selectedId]
  )

  const FILTERS: Array<{ value: Filter; label: string }> = [
    { value: 'semua', label: 'Semua' },
    { value: 'resmi', label: 'Resmi' },
    { value: 'umum', label: 'Umum' },
  ]

  return (
    <div className="pb-6">
      {/* Header ringkas: tombol kembali + judul + status GPS dalam satu baris */}
      <FadeUp className="px-4 pb-2.5 pt-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Kembali"
              className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[19px] font-extrabold leading-tight tracking-tight text-foreground">
              Bengkel Pulau Jawa
            </h1>
            <button
              type="button"
              onClick={loc.refresh}
              aria-label="Perbarui lokasi GPS"
              className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"
            >
              <LocateFixed
                size={12}
                className={cn(
                  loc.status === 'locating' && 'animate-pulse text-foreground',
                  loc.status === 'granted' && 'text-ok',
                  (loc.status === 'denied' || loc.status === 'unavailable') && 'text-warn'
                )}
              />
              <span className="truncate">
                {loc.status === 'locating' && 'Mendeteksi lokasi GPS…'}
                {loc.status === 'granted' &&
                  (userPos && isInJava(userPos.lat, userPos.lng)
                    ? `Dari lokasimu${loc.accuracy ? ` · ±${Math.round(loc.accuracy)} m` : ''}`
                    : 'Lokasi terdeteksi')}
                {(loc.status === 'denied' || loc.status === 'unavailable') &&
                  'GPS nonaktif, ketuk untuk coba lagi'}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort()
              abortRef.current = null
              setData(null)
              setLoading(true)
              // picu deteksi ulang GPS + fetch ulang data bengkel
              loc.refresh()
              setFetchNonce((n) => n + 1)
            }}
            aria-label="Muat ulang data bengkel"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-sm active:scale-90"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin text-foreground')} />
          </button>
        </div>
      </FadeUp>

      {/* Peringatan di luar Pulau Jawa */}
      {outsideJava && !activeCity && (
        <div className="mx-4 mb-2.5 flex items-start gap-2.5 rounded-2xl bg-warn/10 p-3 ring-1 ring-warn/30">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
          <div className="text-xs leading-relaxed text-warn">
            <p className="font-bold">Lokasimu di luar Pulau Jawa</p>
            <p className="mt-0.5 text-warn">
              Cakupan bengkel hanya Pulau Jawa. Menampilkan pusat Jakarta, pilih kota untuk mengubah.
            </p>
          </div>
        </div>
      )}

      {/* Pencarian + pilih kota — digabung satu baris agar ringkas */}
      <FadeUp delay={0.04} className="relative px-4 pt-0.5">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari bengkel atau merek…"
              aria-label="Cari bengkel di Pulau Jawa"
              className="w-full rounded-full bg-card py-2.5 pl-10 pr-9 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 text-muted-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCityListOpen((o) => !o)}
            className="press flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-2.5 shadow-sm"
            aria-expanded={cityListOpen}
            aria-label="Pilih kota"
          >
            <MapIcon size={14} className="shrink-0 text-foreground" />
            <span className="max-w-[84px] truncate text-[13px] font-bold text-foreground">
              {activeCity ?? 'Terdekat'}
            </span>
            <ChevronDown
              size={14}
              className={cn('shrink-0 text-muted-foreground transition-transform', cityListOpen && 'rotate-180')}
            />
          </button>
        </div>
        {cityListOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-4 top-full z-30 mt-2 max-h-64 w-60 overflow-y-auto rounded-2xl bg-card p-1.5 shadow-xl ring-1 ring-border"
          >
            <button
              type="button"
              onClick={() => {
                setActiveCity(null)
                setCityListOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold',
                !activeCity ? 'bg-lime/15 text-foreground' : 'text-foreground active:bg-muted/60'
              )}
            >
              Terdekat dari lokasiku
              <span className="text-[10px] text-muted-foreground">
                {userPos && isInJava(userPos.lat, userPos.lng) ? 'dari GPS' : 'pusat Jawa'}
              </span>
            </button>
            <div className="mx-1 my-1 h-px bg-muted" />
            {CITY_LIST.map((c) => (
              <button
                key={c.city}
                type="button"
                onClick={() => {
                  setActiveCity(c.city)
                  setCityListOpen(false)
                  setSelectedId(null)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold',
                  activeCity === c.city ? 'bg-lime/15 text-foreground' : 'text-foreground active:bg-muted/60'
                )}
              >
                {c.city}
                <span className="text-[10px] font-normal text-muted-foreground">{c.province}</span>
              </button>
            ))}
          </motion.div>
        )}
      </FadeUp>

      {/* Mode + filter — satu baris ringkas */}
      <FadeUp delay={0.08} className="flex items-center gap-2 px-4 pt-2">
        <div className="flex flex-1 items-center gap-1 rounded-full bg-muted p-1">
          {(
            [
              { v: 'daftar' as Mode, label: 'Daftar', icon: List },
              { v: 'peta' as Mode, label: 'Peta', icon: MapIcon },
            ]
          ).map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMode(m.v)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-full py-1 text-xs transition-all',
                mode === m.v
                  ? 'bg-card font-bold text-foreground shadow-sm'
                  : 'font-medium text-muted-foreground'
              )}
            >
              <m.icon size={12} />
              {m.label}
            </button>
          ))}
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              filter === f.value
                ? 'bg-ink text-background'
                : 'bg-card text-muted-foreground shadow-sm'
            )}
          >
            {f.label}
          </button>
        ))}
      </FadeUp>

      {/* Radius pas 5 kolom: presisi, tanpa scroll, tanpa terpotong */}
      {!query && (
        <FadeUp delay={0.11} className="px-4 pt-2">
          <div className="grid grid-cols-5 gap-1.5">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                className={cn(
                  'min-h-8 rounded-full py-1 text-center text-[11px] font-bold transition-all',
                  radiusKm === r
                    ? 'bg-lime text-on-lime'
                    : 'bg-card text-muted-foreground shadow-sm'
                )}
              >
                {r} km
              </button>
            ))}
          </div>
        </FadeUp>
      )}

      {/* Info jumlah hasil + status sumber data */}
      <FadeUp delay={0.14} className="px-4 pt-2">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-muted-foreground">
          {live ? (
            <span className="inline-flex items-center gap-1 text-ok">
              <MapPin size={11} />
              Live OSM
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-warn">
              <WifiOff size={11} />
              Mode demo
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>
            {loading
              ? 'memuat bengkel dari peta…'
              : query
                ? `${shown.length} hasil untuk “${query}”`
                : `${shown.length} bengkel dalam radius ${radiusKm} km dari ${refLabel}`}
          </span>
        </p>
      </FadeUp>

      {/* Konten */}
      {mode === 'peta' ? (
        <div className="px-4 pt-2.5">
          <BengkelMap
            center={[refPoint.lat, refPoint.lng]}
            radiusKm={radiusKm}
            bengkel={shown.slice(0, 60).map((x) => x.b)}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
            userPos={userPos && isInJava(userPos.lat, userPos.lng) ? userPos : null}
            accuracy={loc.accuracy}
            className="h-[400px] w-full"
          />
          {selected && (
            <div className="-mt-8 px-3 pb-1">
              <BengkelCard
                b={selected}
                refPoint={refPoint}
                compact
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
          {!loading && shown.length === 0 && (
            <p className="pt-3 text-center text-xs text-muted-foreground">
              Tidak ada bengkel dalam radius. Perluas radius atau pilih kota lain.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 px-4 pt-2.5">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl bg-card p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-2xl bg-muted" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-3/4 rounded-full bg-muted" />
                    <div className="h-3 w-1/2 rounded-full bg-muted" />
                  </div>
                </div>
                <div className="mt-3 h-3 w-2/3 rounded-full bg-muted" />
              </div>
            ))
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-card p-8 text-center shadow-sm">
              <Wrench size={32} className="mx-auto text-muted-foreground/70" />
              <p className="mt-2 text-sm font-semibold text-foreground">
                Bengkel tidak ditemukan
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Coba kata kunci lain, perluas radius, atau pilih daerah lain di Pulau Jawa.
              </p>
            </div>
          ) : (
            shown.slice(0, 40).map(({ b, d }, i) => (
              <BengkelCard key={b.id} b={b} refPoint={refPoint} distanceKm={d} index={i} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function BengkelCard({
  b,
  refPoint,
  distanceKm,
  compact,
  onClose,
  index = 0,
}: {
  b: Bengkel
  refPoint: LatLng
  distanceKm?: number
  compact?: boolean
  onClose?: () => void
  index?: number
}) {
  const open = isOpenNow(b.hours)
  const dist = distanceKm ?? distanceFrom(b, refPoint)
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: compact ? 0 : Math.min(index * 0.035, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileTap={compact ? undefined : { scale: 0.99 }}
      className="rounded-3xl bg-card p-3.5 shadow-sm"
    >
      {onClose && (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X size={13} />
          </button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            b.type === 'resmi' ? 'bg-lime/15' : 'bg-muted'
          )}
        >
          {b.type === 'resmi' ? (
            <Building2 size={20} className="text-foreground" />
          ) : (
            <Wrench size={20} className="text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[13.5px] font-bold leading-snug text-foreground">{b.name}</h2>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                b.type === 'resmi' ? 'bg-lime/15 text-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {b.type === 'resmi' ? 'Resmi' : 'Umum'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {b.brand}
            {b.city ? ` · ${b.city}` : ''}
          </p>
          {typeof b.rating === 'number' ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                <Star size={13} className="fill-warn text-warn" />
                {b.rating}
              </span>
              <span className="text-[11px] text-muted-foreground">({b.reviews})</span>
              <span className="text-[11px] font-bold text-foreground">· {formatDistance(dist)}</span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] font-bold text-foreground">{formatDistance(dist)}</p>
          )}
        </div>
      </div>

      {b.address && (
        <p className="mt-2 line-clamp-1 text-xs leading-relaxed text-muted-foreground">{b.address}</p>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
        <span
          className={cn(
            'text-xs font-bold',
            open ? 'text-ok' : 'text-danger'
          )}
        >
          {b.hours ? `${open ? 'Buka' : 'Tutup'} · ${b.hours}` : open ? 'Buka' : 'Tutup'}
        </span>
        <div className="flex gap-2">
          {b.phone && (
            <a
              href={`tel:${b.phone.replace(/[^0-9+]/g, '')}`}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground active:scale-95"
            >
              <Phone size={13} />
              Telepon
            </a>
          )}
          <a
            href={gmapsDirectionUrl(b, refPoint)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full bg-lime px-3.5 py-1.5 text-xs font-bold text-on-lime active:scale-95"
          >
            <Navigation size={13} />
            Rute
          </a>
        </div>
      </div>
    </motion.article>
  )
}
