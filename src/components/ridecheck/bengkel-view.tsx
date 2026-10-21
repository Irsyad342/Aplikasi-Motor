'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2, Navigation, Phone, Search, Star, Wrench, Map as MapIcon,
  List, LocateFixed, ChevronDown, X, MapPin, AlertTriangle, RefreshCw, WifiOff,
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

export function BengkelView() {
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
      <header className="px-4 pb-3 pt-5">
        <h1 className="text-center text-xl font-bold text-zinc-900">Bengkel Pulau Jawa</h1>
        <div className="mt-0.5 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
          <button
            type="button"
            onClick={loc.refresh}
            aria-label="Perbarui lokasi GPS"
            className="flex items-center gap-1"
          >
            <LocateFixed
              size={12}
              className={cn(
                loc.status === 'locating' && 'animate-pulse text-sky-500',
                loc.status === 'granted' && 'text-green-500',
                (loc.status === 'denied' || loc.status === 'unavailable') && 'text-amber-500'
              )}
            />
          </button>
          {loc.status === 'locating' && 'Mendeteksi lokasi GPS…'}
          {loc.status === 'granted' &&
            (userPos && isInJava(userPos.lat, userPos.lng)
              ? `Dari lokasimu${loc.accuracy ? ` · ±${Math.round(loc.accuracy)} m` : ''}`
              : 'Lokasi terdeteksi')}
          {(loc.status === 'denied' || loc.status === 'unavailable') &&
            'GPS nonaktif — ketuk untuk coba lagi'}
        </div>
      </header>

      {/* Peringatan di luar Pulau Jawa */}
      {outsideJava && !activeCity && (
        <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="text-xs leading-relaxed text-amber-800">
            <p className="font-bold">Lokasimu di luar Pulau Jawa</p>
            <p className="mt-0.5 text-amber-700">
              Cakupan bengkel hanya Pulau Jawa. Menampilkan pusat Jakarta — pilih kota untuk mengubah.
            </p>
          </div>
        </div>
      )}

      {/* Status sumber data */}
      <div className="flex items-center justify-between px-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
          {live ? (
            <>
              <MapPin size={11} className="text-green-500" />
              Data live OpenStreetMap · Pulau Jawa
            </>
          ) : (
            <>
              <WifiOff size={11} className="text-amber-500" />
              Mode demo (server peta tidak terjangkau)
            </>
          )}
        </p>
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
          className="text-zinc-300 active:scale-90"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin text-sky-500')} />
        </button>
      </div>

      {/* Pencarian */}
      <div className="px-4 pt-2">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama bengkel atau merek…"
            aria-label="Cari bengkel di Pulau Jawa"
            className="w-full rounded-full bg-white py-3 pl-11 pr-10 text-sm text-zinc-800 shadow-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-zinc-100 p-1 text-zinc-400"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Pilihan kota (Pulau Jawa) */}
      <div className="relative px-4 pt-3">
        <button
          type="button"
          onClick={() => setCityListOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-sm"
          aria-expanded={cityListOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <MapIcon size={15} className="text-sky-500" />
            {activeCity ?? 'Terdekat dari lokasiku'}
            {!activeCity && !userPos && !loc.status.startsWith('den') && loc.status !== 'unavailable' && (
              <span className="text-[10px] font-medium text-zinc-400">· mencari GPS…</span>
            )}
            {!activeCity && (loc.status === 'denied' || loc.status === 'unavailable') && (
              <span className="text-[10px] font-medium text-amber-500">· GPS nonaktif</span>
            )}
          </span>
          <ChevronDown size={16} className={cn('text-zinc-400 transition-transform', cityListOpen && 'rotate-180')} />
        </button>
        {cityListOpen && (
          <div className="absolute inset-x-4 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-zinc-100">
            <button
              type="button"
              onClick={() => {
                setActiveCity(null)
                setCityListOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold',
                !activeCity ? 'bg-sky-50 text-sky-600' : 'text-zinc-700 active:bg-zinc-50'
              )}
            >
              Terdekat dari lokasiku
              <span className="text-[10px] text-zinc-400">
                {userPos && isInJava(userPos.lat, userPos.lng) ? 'dari GPS' : 'pusat Jawa'}
              </span>
            </button>
            <div className="mx-1 my-1 h-px bg-zinc-100" />
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
                  activeCity === c.city ? 'bg-sky-50 text-sky-600' : 'text-zinc-700 active:bg-zinc-50'
                )}
              >
                {c.city}
                <span className="text-[10px] font-normal text-zinc-400">{c.province}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode + filter */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="flex flex-1 items-center gap-1.5 rounded-full bg-zinc-200/70 p-1">
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
                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs transition-all',
                mode === m.v
                  ? 'bg-white font-bold text-zinc-900 shadow-sm'
                  : 'font-medium text-zinc-500'
              )}
            >
              <m.icon size={13} />
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
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-500 shadow-sm'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chip radius */}
      {!query && (
        <div className="flex items-center gap-1.5 px-4 pt-3">
          <span className="text-[11px] font-semibold text-zinc-400">Radius:</span>
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
                radiusKm === r ? 'bg-sky-500 text-white' : 'bg-white text-zinc-500 shadow-sm'
              )}
            >
              {r} km
            </button>
          ))}
        </div>
      )}

      {/* Info jumlah hasil */}
      <p className="px-4 pt-3 text-[11px] font-medium text-zinc-400">
        {loading
          ? 'Memuat bengkel dari peta…'
          : query
            ? `${shown.length} hasil untuk “${query}” · dari ${refLabel}`
            : `${shown.length} bengkel dalam radius ${radiusKm} km dari ${refLabel}`}
      </p>

      {/* Konten */}
      {mode === 'peta' ? (
        <div className="px-4 pt-3">
          <BengkelMap
            center={[refPoint.lat, refPoint.lng]}
            radiusKm={radiusKm}
            bengkel={shown.slice(0, 60).map((x) => x.b)}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
            userPos={userPos && isInJava(userPos.lat, userPos.lng) ? userPos : null}
            accuracy={loc.accuracy}
            className="h-[380px] w-full"
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
            <p className="pt-3 text-center text-xs text-zinc-400">
              Tidak ada bengkel dalam radius — perluas radius atau pilih kota lain.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-zinc-100" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-3/4 rounded-full bg-zinc-100" />
                    <div className="h-3 w-1/2 rounded-full bg-zinc-100" />
                  </div>
                </div>
                <div className="mt-3 h-3 w-2/3 rounded-full bg-zinc-100" />
              </div>
            ))
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Wrench size={32} className="mx-auto text-zinc-300" />
              <p className="mt-2 text-sm font-semibold text-zinc-700">
                Bengkel tidak ditemukan
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Coba kata kunci lain, perluas radius, atau pilih daerah lain di Pulau Jawa.
              </p>
            </div>
          ) : (
            shown.slice(0, 40).map(({ b, d }) => (
              <BengkelCard key={b.id} b={b} refPoint={refPoint} distanceKm={d} />
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
}: {
  b: Bengkel
  refPoint: LatLng
  distanceKm?: number
  compact?: boolean
  onClose?: () => void
}) {
  const open = isOpenNow(b.hours)
  const dist = distanceKm ?? distanceFrom(b, refPoint)
  return (
    <article
      className={cn(
        'rounded-3xl bg-white shadow-sm',
        compact ? 'p-4' : 'p-4'
      )}
    >
      {onClose && (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"
          >
            <X size={13} />
          </button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            b.type === 'resmi' ? 'bg-sky-50' : 'bg-zinc-100'
          )}
        >
          {b.type === 'resmi' ? (
            <Building2 size={22} className="text-sky-600" />
          ) : (
            <Wrench size={22} className="text-zinc-600" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold leading-snug text-zinc-900">{b.name}</h2>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                b.type === 'resmi' ? 'bg-sky-50 text-sky-600' : 'bg-zinc-100 text-zinc-500'
              )}
            >
              {b.type === 'resmi' ? 'Resmi' : 'Umum'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {b.brand}
            {b.city ? ` · ${b.city}` : ''}
          </p>
          {typeof b.rating === 'number' ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-zinc-800">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                {b.rating}
              </span>
              <span className="text-[11px] text-zinc-400">({b.reviews} ulasan)</span>
              <span className="text-[11px] font-bold text-sky-600">· {formatDistance(dist)}</span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] font-bold text-sky-600">{formatDistance(dist)}</p>
          )}
        </div>
      </div>

      {b.address && (
        <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{b.address}</p>
      )}

      {b.services.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {b.services.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
        <span
          className={cn(
            'text-xs font-bold',
            open ? 'text-green-600' : 'text-red-500'
          )}
        >
          {b.hours ? `${open ? 'Buka' : 'Tutup'} · ${b.hours}` : open ? 'Buka' : 'Tutup'}
        </span>
        <div className="flex gap-2">
          {b.phone && (
            <a
              href={`tel:${b.phone.replace(/[^0-9+]/g, '')}`}
              className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 active:scale-95"
            >
              <Phone size={13} />
              Telepon
            </a>
          )}
          <a
            href={gmapsDirectionUrl(b, refPoint)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-white active:scale-95"
          >
            <Navigation size={13} />
            Rute
          </a>
        </div>
      </div>
    </article>
  )
}
