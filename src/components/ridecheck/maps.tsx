'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { Bike, Crosshair, MapPin, Navigation } from 'lucide-react'
import type { Bengkel } from '@/lib/bengkel'
import { DEFAULT_LOCATION, haversineKm } from '@/lib/geo'
import { cn } from '@/lib/utils'

type LMap = import('leaflet').Map
type LMarker = import('leaflet').Marker
type LPolyline = import('leaflet').Polyline
type LLatLng = import('leaflet').LatLngExpression

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// ---------- Ikon marker ----------

function motorIconHtml(heading: number, live: boolean) {
  return `<div style="position:relative;width:40px;height:40px;">
    ${live ? `<div style="position:absolute;inset:0;border-radius:9999px;background:#0ea5e9;opacity:.35;animation:rcPing 1.4s ease-out infinite;"></div>` : ''}
    <div style="position:absolute;inset:4px;border-radius:9999px;background:#0ea5e9;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(2,132,199,.45);display:flex;align-items:center;justify-content:center;">
      <svg style="transform:rotate(${heading}deg);transition:transform .4s;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
    </div>
  </div>`
}

function userDotHtml() {
  return `<div style="position:relative;width:22px;height:22px;">
    <div style="position:absolute;inset:0;border-radius:9999px;background:#3b82f6;opacity:.3;animation:rcPing 1.6s ease-out infinite;"></div>
    <div style="position:absolute;inset:6px;border-radius:9999px;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 1px 6px rgba(59,130,246,.6);"></div>
  </div>`
}

function bengkelIconHtml(b: Bengkel, selected: boolean) {
  const sky = b.type === 'resmi'
  const bg = sky ? '#0ea5e9' : '#71717a'
  const size = selected ? 40 : 30
  const icon = sky
    ? `<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M4 10h16"/>`
    : `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`
  return `<div style="position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-100%);">
    ${selected ? `<div style="position:absolute;left:50%;bottom:-4px;width:10px;height:10px;background:${bg};transform:translateX(-50%) rotate(45deg);"></div>` : ''}
    <div style="position:absolute;inset:0;border-radius:${selected ? '12px' : '9999px'};background:${bg};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;">
      <svg width="${selected ? 20 : 15}" height="${selected ? 20 : 15}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
    </div>
  </div>`
}

const RC_PING_CSS = `
@keyframes rcPing { 0% { transform: scale(.6); opacity: .8 } 80%, 100% { transform: scale(1.9); opacity: 0 } }
.leaflet-container { font-family: inherit; background: #e8edf2; }
.leaflet-control-attribution { font-size: 8px !important; background: rgba(255,255,255,.7) !important; }
`

// ---------- Hook dasar peta ----------

function useLeafletMap(
  ref: React.RefObject<HTMLDivElement | null>,
  opts: { center: LLatLng; zoom: number }
) {
  const mapRef = useRef<LMap | null>(null)
  const readyRef = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = await import('leaflet')
      if (cancelled || !ref.current || mapRef.current) return
      const map = L.map(ref.current, {
        center: opts.center,
        zoom: opts.zoom,
        zoomControl: false,
        attributionControl: true,
      })
      L.tileLayer(TILES, { attribution: ATTRIB, maxZoom: 19 }).addTo(map)
      mapRef.current = map
      readyRef.current = true
      setReady(true)
      setTimeout(() => map.invalidateSize(), 150)
    }
    void init()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      readyRef.current = false
    }
  }, [])

  return { map: mapRef, ready }
}

// ---------- Peta live perjalanan ----------

export function LiveTripMap({
  path,
  current,
  heading,
  simMode,
  className,
}: {
  path: [number, number][]
  current: [number, number] | null
  heading: number
  simMode: boolean
  className?: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const { map, ready } = useLeafletMap(holder, {
    center: current ?? [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
    zoom: 16,
  })
  const [follow, setFollow] = useState(true)
  const lineRef = useRef<LPolyline | null>(null)
  const markerRef = useRef<LMarker | null>(null)
  const startRef = useRef<import('leaflet').CircleMarker | null>(null)
  const startPosRef = useRef<[number, number] | null>(null)

  // buat layer saat peta siap
  useEffect(() => {
    if (!ready || !map.current) return
    let cancelled = false
    async function build() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return
      lineRef.current = L.polyline([], {
        color: '#0ea5e9',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map.current)
      markerRef.current = L.marker(map.current.getCenter(), {
        icon: L.divIcon({
          html: motorIconHtml(0, true),
          className: 'rc-motor-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
        zIndexOffset: 1000,
        keyboard: false,
      }).addTo(map.current)
    }
    void build()
    return () => {
      cancelled = true
      lineRef.current = null
      markerRef.current = null
      startRef.current = null
      startPosRef.current = null
    }
  }, [ready, map])

  // update path & posisi
  useEffect(() => {
    if (!ready || !lineRef.current || !markerRef.current) return
    lineRef.current.setLatLngs(path as LLatLng[])
    // marker titik mulai ikut pindah bila rute direset ke lokasi GPS nyata
    if (path.length > 0 && startRef.current && startPosRef.current) {
      const moved = haversineKm(
        { lat: startPosRef.current[0], lng: startPosRef.current[1] },
        { lat: path[0][0], lng: path[0][1] }
      )
      if (moved > 0.05) {
        startRef.current.setLatLng(path[0] as LLatLng)
        startPosRef.current = path[0]
      }
    }
    if (current) {
      markerRef.current.setLatLng(current)
      const el = markerRef.current.getElement()?.querySelector('svg')
      if (el) el.style.transform = `rotate(${heading}deg)`
      if (follow && map.current) {
        map.current.setView(current, map.current.getZoom(), { animate: true, duration: 0.5 })
      }
    }
  }, [ready, path, current, heading, follow, map])

  // mulai path: marker titik mulai
  useEffect(() => {
    if (!ready || !map.current || path.length === 0 || startRef.current) return
    let cancelled = false
    async function add() {
      const L = await import('leaflet')
      if (cancelled || !map.current || !L) return
      startRef.current = L.circleMarker(path[0] as LLatLng, {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 1,
      }).addTo(map.current!)
      startPosRef.current = path[0]
    }
    void add()
  }, [ready, path, map])

  function recenter() {
    setFollow(true)
    if (current && map.current) map.current.setView(current, 16, { animate: true })
  }

  return (
    <div className={cn('relative overflow-hidden rounded-3xl shadow-sm', className)}>
      <style>{RC_PING_CSS}</style>
      <div ref={holder} className="h-full w-full" aria-label="Peta perjalanan live" />
      {simMode && (
        <div className="absolute left-3 top-3 z-[500] rounded-full bg-amber-400/95 px-3 py-1.5 text-[10px] font-bold text-amber-950 shadow">
          MODE SIMULASI
        </div>
      )}
      <button
        type="button"
        onClick={recenter}
        aria-label="Pusatkan ke posisi motor"
        className={cn(
          'absolute right-3 top-3 z-[500] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-colors',
          follow ? 'text-sky-600' : 'text-zinc-500'
        )}
      >
        <Crosshair size={19} />
      </button>
      {!follow && current && (
        <div className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2">
          <button
            type="button"
            onClick={recenter}
            className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-lg active:scale-95"
          >
            <Navigation size={13} className="text-sky-400" />
            Ikuti Posisi Motor
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Peta rute perjalanan tersimpan ----------

export function RouteMap({
  path,
  className,
}: {
  path: [number, number][]
  className?: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const { map, ready } = useLeafletMap(holder, {
    center: path[0] ?? [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
    zoom: 15,
  })

  useEffect(() => {
    if (!ready || !map.current || path.length < 2) return
    let cancelled = false
    async function build() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return
      L.polyline(path as LLatLng[], {
        color: '#0ea5e9',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map.current!)
      L.circleMarker(path[0] as LLatLng, {
        radius: 5, color: '#fff', weight: 2, fillColor: '#22c55e', fillOpacity: 1,
      }).addTo(map.current!)
      const last = path[path.length - 1]
      L.circleMarker(last as LLatLng, {
        radius: 5, color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1,
      }).addTo(map.current!)
      map.current!.fitBounds(
        (L as typeof import('leaflet')).latLngBounds(path as LLatLng[]).pad(0.12)
      )
    }
    void build()
    return () => {
      cancelled = true
    }
  }, [ready, path, map])

  return (
    <div className={cn('overflow-hidden rounded-2xl', className)}>
      <style>{RC_PING_CSS}</style>
      <div ref={holder} className="h-full w-full" aria-label="Peta rute perjalanan" />
    </div>
  )
}

// ---------- Peta bengkel ----------

export function BengkelMap({
  center,
  radiusKm,
  bengkel,
  selectedId,
  onSelect,
  userPos,
  accuracy,
  className,
}: {
  center: [number, number]
  radiusKm: number
  bengkel: Bengkel[]
  selectedId: string | null
  onSelect: (id: string) => void
  userPos: { lat: number; lng: number } | null
  /** akurasi GPS dalam meter (opsional) untuk lingkaran ketidakpastian */
  accuracy?: number | null
  className?: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const { map, ready } = useLeafletMap(holder, { center, zoom: 14 })
  const markersRef = useRef<Map<string, LMarker>>(new Map())
  const userRef = useRef<LMarker | null>(null)
  const circleRef = useRef<import('leaflet').Circle | null>(null)
  const accCircleRef = useRef<import('leaflet').Circle | null>(null)
  const userMovedRef = useRef(false)
  const prevCenterRef = useRef<string | null>(null)
  const fittedRef = useRef('')
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // deteksi geser/zoom manual agar peta tidak "diculik" saat posisi GPS update
  useEffect(() => {
    if (!ready || !map.current) return
    const m = map.current
    const mark = () => {
      userMovedRef.current = true
    }
    m.on('dragstart', mark)
    m.on('zoomstart', mark)
    return () => {
      m.off('dragstart', mark)
      m.off('zoomstart', mark)
    }
  }, [ready, map])

  // titik acuan berubah (GPS fix masuk / ganti kota) -> pusatkan peta,
  // kecuali pengguna sedang menjelajah peta sendiri
  useEffect(() => {
    if (!ready || !map.current) return
    const key = `${center[0]},${center[1]}`
    const prev = prevCenterRef.current
    prevCenterRef.current = key
    if (prev === null || prev === key || userMovedRef.current) return
    map.current.panTo(center as LLatLng, { animate: true, duration: 0.6 })
  }, [ready, center, map])

  // render ulang marker ketika daftar berubah
  useEffect(() => {
    if (!ready || !map.current) return
    let cancelled = false
    async function build() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return
      // hapus marker lama
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = new Map()

      for (const b of bengkel) {
        const sel = b.id === selectedId
        const marker = L.marker([b.lat, b.lng] as LLatLng, {
          icon: L.divIcon({
            html: bengkelIconHtml(b, sel),
            className: 'rc-bengkel-marker',
            iconSize: [sel ? 40 : 30, sel ? 40 : 30],
            iconAnchor: [sel ? 20 : 15, sel ? 40 : 30],
          }),
          keyboard: false,
          zIndexOffset: sel ? 800 : 0,
        }).addTo(map.current!)
        marker.on('click', () => onSelectRef.current(b.id))
        markersRef.current.set(b.id, marker)
      }

      // ring radius
      circleRef.current?.remove()
      circleRef.current = L.circle(center as LLatLng, {
        radius: radiusKm * 1000,
        color: '#0ea5e9',
        weight: 1.5,
        opacity: 0.55,
        fillColor: '#0ea5e9',
        fillOpacity: 0.05,
        dashArray: '6 8',
      }).addTo(map.current!)

      // fit bounds saat pusa/radius berubah atau pertama kali
      const fitKey = `${center[0]},${center[1]},${radiusKm}`
      if (bengkel.length > 0 && fittedRef.current !== fitKey) {
        fittedRef.current = fitKey
        const bounds = (L as typeof import('leaflet')).latLngBounds(
          bengkel.map((b) => [b.lat, b.lng] as LLatLng)
        )
        map.current!.flyToBounds(bounds.pad(0.15), { maxZoom: 15, duration: 0.6 })
      }
    }
    void build()
    return () => {
      cancelled = true
    }
  }, [ready, bengkel, selectedId, center, radiusKm, map])

  // marker posisi pengguna + lingkaran akurasi GPS
  useEffect(() => {
    if (!ready || !map.current) return
    let cancelled = false
    async function build() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return
      userRef.current?.remove()
      userRef.current = null
      accCircleRef.current?.remove()
      accCircleRef.current = null
      if (!userPos) return
      if (typeof accuracy === 'number' && accuracy > 0) {
        accCircleRef.current = L.circle([userPos.lat, userPos.lng] as LLatLng, {
          radius: Math.min(Math.max(accuracy, 8), 500),
          color: '#3b82f6',
          weight: 1,
          opacity: 0.4,
          fillColor: '#3b82f6',
          fillOpacity: 0.07,
        }).addTo(map.current!)
      }
      userRef.current = L.marker([userPos.lat, userPos.lng] as LLatLng, {
        icon: L.divIcon({
          html: userDotHtml(),
          className: 'rc-user-marker',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        zIndexOffset: 900,
        keyboard: false,
      }).addTo(map.current!)
    }
    void build()
    return () => {
      cancelled = true
    }
  }, [ready, userPos, accuracy, map])

  // pilih marker -> pan
  useEffect(() => {
    if (!selectedId || !map.current) return
    const m = markersRef.current.get(selectedId)
    if (m) map.current.panTo(m.getLatLng(), { animate: true, duration: 0.4 })
  }, [selectedId, map])

  return (
    <div className={cn('relative overflow-hidden rounded-3xl shadow-sm', className)}>
      <style>{RC_PING_CSS}</style>
      <div ref={holder} className="h-full w-full" aria-label="Peta bengkel" />
      <button
        type="button"
        onClick={() => {
          userMovedRef.current = false
          prevCenterRef.current = `${center[0]},${center[1]}`
          map.current?.flyTo(center as LLatLng, 14, { duration: 0.5 })
        }}
        aria-label="Pusatkan ke titik acuan"
        className="absolute right-3 top-3 z-[500] flex h-10 w-10 items-center justify-center rounded-full bg-white text-sky-600 shadow-lg transition-colors active:scale-95"
      >
        <Crosshair size={19} />
      </button>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-zinc-600 shadow">
        <MapPin size={11} className="text-sky-500" />
        Resmi
        <span className="mx-0.5 h-2 w-px bg-zinc-200" />
        <Bike size={11} className="text-zinc-500" />
        Umum
      </div>
    </div>
  )
}
