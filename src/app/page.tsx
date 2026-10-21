'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Wrench, X } from 'lucide-react'
import type { AppState, ComponentDTO, VehicleDTO } from '@/lib/state'
import { BENGKEL_LIST } from '@/lib/bengkel'
import { bearingDeg, haversineKm, DEFAULT_LOCATION, type LatLng } from '@/lib/geo'
import { useLocation } from '@/lib/use-location'
import { BottomNav, type View } from '@/components/ridecheck/bottom-nav'
import { Dashboard } from '@/components/ridecheck/dashboard'
import { ComponentDetail } from '@/components/ridecheck/component-detail'
import { TripsView, type TrackingState } from '@/components/ridecheck/trips-view'
import { HistoryView } from '@/components/ridecheck/history-view'
import { BengkelView } from '@/components/ridecheck/bengkel-view'
import { SearchOverlay } from '@/components/ridecheck/search-overlay'
import { ServiceWorkerRegister, InstallPrompt } from '@/components/ridecheck/pwa'
import type { View as NavView } from '@/components/ridecheck/bottom-nav'
import {
  AddVehicleDialog,
  EditVehicleDialog,
  OdometerDialog,
  ServiceDialog,
  SettingsSheet,
} from '@/components/ridecheck/dialogs'

async function api<T = unknown>(
  path: string,
  method: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Terjadi kesalahan')
  }
  return res.json() as Promise<T>
}

interface SimState {
  seg: number
  frac: number
  speed: number // km/jam
}

/**
 * Buat rute simulasi LOOP di sekitar titik pusat yang diberikan
 * (posisi GPS pengguna sekarang) — bukan lagi rute Jakarta yang tetap.
 */
function makeSimRoute(center: LatLng): [number, number][] {
  const route: [number, number][] = []
  const points = 16
  // radius kecil 0,28–0,5 km: loop kota realistis & lompatan awal pendek
  const radii = [0.42, 0.48, 0.4, 0.34, 0.3, 0.32, 0.38, 0.46, 0.5, 0.42, 0.36, 0.3, 0.28, 0.34, 0.4, 0.46]
  for (let i = 0; i < points; i++) {
    const ang = (i / points) * Math.PI * 2
    const radKm = radii[i]
    const dLat = (radKm / 111.32) * Math.cos(ang)
    const dLng =
      (radKm / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)))) * Math.sin(ang)
    route.push([center.lat + dLat, center.lng + dLng])
  }
  route.push([route[0][0], route[0][1]])
  return route
}

function advanceSim(route: [number, number][], sp: SimState, stepKm: number): LatLng {
  let from = route[sp.seg]
  let to = route[(sp.seg + 1) % route.length]
  let segLen = Math.max(0.02, haversineKm({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] }))
  let remain = stepKm
  while (remain > 0) {
    const remainSeg = (1 - sp.frac) * segLen
    if (remain < remainSeg) {
      sp.frac += remain / segLen
      remain = 0
    } else {
      remain -= remainSeg
      sp.seg = (sp.seg + 1) % route.length
      sp.frac = 0
      from = route[sp.seg]
      to = route[(sp.seg + 1) % route.length]
      segLen = Math.max(0.02, haversineKm({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] }))
    }
  }
  return { lat: from[0] + (to[0] - from[0]) * sp.frac, lng: from[1] + (to[1] - from[1]) * sp.frac }
}

export default function Home() {
  const [state, setState] = useState<AppState | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [view, setView] = useState<View>('kendaraan')
  const [tab, setTab] = useState<'komponen' | 'perawatan'>('komponen')

  // Overlays
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Lokasi GPS asli (jangan fallback diam-diam ke Jakarta)
  const loc = useLocation()
  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [odoOpen, setOdoOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<VehicleDTO | null>(null)
  const [serviceFor, setServiceFor] = useState<ComponentDTO | null>(null)

  // Select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Chips
  const [autoTrack, setAutoTrack] = useState(false)
  const [reminder, setReminder] = useState(true)

  // Tracking
  const [tracking, setTracking] = useState<TrackingState | null>(null)
  const watchRef = useRef<number | null>(null)
  const lastPosRef = useRef<LatLng | null>(null)
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simStateRef = useRef<SimState | null>(null)
  const simRouteRef = useRef<[number, number][]>([])
  const simPrevRef = useRef<LatLng | null>(null) // posisi rute sim terakhir (jarak diukur antar titik rute, bukan lompatan awal)
  const pathRef = useRef<[number, number][]>([])
  const headingRef = useRef(0)
  const [livePath, setLivePath] = useState<[number, number][]>([])
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null)
  const [heading, setHeading] = useState(0)
  const [, setTick] = useState(0)
  // Sumber posisi saat tracking: 'waiting' = mencari GPS, 'gps' = fix asli, 'sim' = simulasi
  const [locMode, setLocMode] = useState<'waiting' | 'gps' | 'sim'>('waiting')
  const gpsModeRef = useRef<'waiting' | 'gps' | 'sim'>('waiting')
  const pendingSimRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------- Data ----------
  const loadState = useCallback(async (id?: string) => {
    const res = await fetch(id ? `/api/state?vehicleId=${id}` : '/api/state', {
      cache: 'no-store',
    })
    const data: AppState = await res.json()
    setState(data)
    if (data.vehicle) setVehicleId(data.vehicle.id)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pemuatan data awal dari API saat mount
    loadState().catch((e) => toast.error(e instanceof Error ? e.message : 'Gagal memuat data'))
  }, [loadState])

  // chips dari localStorage
  useEffect(() => {
    const auto = localStorage.getItem('rc-auto') === '1'
    const rem = localStorage.getItem('rc-reminder') !== '0'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi store eksternal saat mount
    setAutoTrack(auto)
    setReminder(rem)
  }, [])

  // Deep-link dari shortcut PWA: /?view=perjalanan|bengkel|riwayat
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'perjalanan' || v === 'bengkel' || v === 'riwayat' || v === 'kendaraan') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- baca URL saat mount untuk navigasi awal
      setView(v as NavView)
    }
  }, [])

  // tick re-render saat tracking aktif
  useEffect(() => {
    if (!tracking) return
    const i = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(i)
  }, [tracking?.startedAt, tracking])

  const vehicle = state?.vehicle ?? null

  // ---------- Tracking ----------
  const clearSimPending = useCallback(() => {
    if (pendingSimRef.current) {
      clearTimeout(pendingSimRef.current)
      pendingSimRef.current = null
    }
  }, [])

  const stopTrackingSensors = useCallback(() => {
    if (watchRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    if (simRef.current) {
      clearInterval(simRef.current)
      simRef.current = null
    }
    clearSimPending()
  }, [clearSimPending])

  // Mode simulasi: motor bergerak di rute loop di sekitar posisi pengguna.
  // HANYA dijalankan bila GPS terbukti tidak tersedia — jangan pernah dicampur
  // dengan data GPS nyata (jarak & rute direset saat fix GPS pertama masuk).
  const startSimEngine = useCallback(() => {
    if (simRef.current) return
    gpsModeRef.current = 'sim'
    setLocMode('sim')
    simRef.current = setInterval(() => {
      const sp = simStateRef.current
      if (!sp || lastPosRef.current) return // GPS aktif -> hentikan simulasi
      sp.speed = Math.min(38, Math.max(16, sp.speed + (Math.random() - 0.5) * 6))
      const stepKm = sp.speed / 3600
      const cur = advanceSim(simRouteRef.current, sp, stepKm)
      // jarak HANYA dihitung antar titik rute simulasi — lompatan awal
      // dari posisi asli ke titik mulai rute TIDAK dihitung sebagai tempuh
      const prevSim = simPrevRef.current
      simPrevRef.current = cur
      const d = prevSim ? haversineKm(prevSim, cur) : 0
      if (d > 0.0005) {
        const prev = pathRef.current[pathRef.current.length - 1]
        if (prev) {
          headingRef.current = bearingDeg({ lat: prev[0], lng: prev[1] }, cur)
          setHeading(headingRef.current)
        }
        pathRef.current = [...pathRef.current, [cur.lat, cur.lng] as [number, number]]
        setLivePath(pathRef.current)
        setTracking((p) => (p ? { ...p, distance: p.distance + d } : p))
      }
      setCurrentPos([cur.lat, cur.lng])
    }, 1000)
  }, [])

  const startTracking = useCallback(() => {
    stopTrackingSensors()
    lastPosRef.current = null
    pathRef.current = []
    headingRef.current = 0
    simPrevRef.current = null
    simStateRef.current = { seg: 0, frac: 0, speed: 24 }
    gpsModeRef.current = 'waiting'
    setLocMode('waiting')
    // Simulasi berputar di sekitar posisi GPS pengguna sekarang
    const base = loc.pos ?? DEFAULT_LOCATION
    simRouteRef.current = makeSimRoute(base)
    // Jika posisi GPS tersedia, mulai dari posisi asli
    if (loc.pos) {
      pathRef.current = [[base.lat, base.lng]]
      setLivePath(pathRef.current)
      setCurrentPos([base.lat, base.lng])
    } else {
      setLivePath([])
      setCurrentPos(null)
    }
    setTracking({ startedAt: Date.now(), distance: 0, geoFixes: 0 })

    // Mode GPS nyata: rekam posisi asli pengguna
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          if (!Number.isFinite(cur.lat) || !Number.isFinite(cur.lng)) return
          // Fix GPS pertama: buang SELURUH data simulasi, mulai hitungan bersih
          if (lastPosRef.current === null) {
            gpsModeRef.current = 'gps'
            setLocMode('gps')
            clearSimPending()
            if (simRef.current) {
              clearInterval(simRef.current)
              simRef.current = null
            }
            pathRef.current = [[cur.lat, cur.lng]]
            setLivePath(pathRef.current)
            setCurrentPos([cur.lat, cur.lng])
            lastPosRef.current = cur
            setTracking((prev) =>
              prev ? { ...prev, distance: 0, geoFixes: 1 } : prev
            )
            return
          }
          const last = lastPosRef.current
          lastPosRef.current = cur
          setCurrentPos([cur.lat, cur.lng])
          const acc = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 0
          const d = haversineKm(last, cur)
          // Fix tidak presisi (>100 m) atau lompatan jauh (>1 km):
          // posisi marker diperbarui, tapi TIDAK dihitung sebagai jarak/rute
          if (acc > 100 || d >= 1) return
          if (d > 0.003) {
            headingRef.current = bearingDeg(last, cur)
            setHeading(headingRef.current)
            if (pathRef.current.length < 2500) {
              pathRef.current = [...pathRef.current, [cur.lat, cur.lng] as [number, number]]
              setLivePath(pathRef.current)
            }
            setTracking((prev) =>
              prev
                ? { ...prev, distance: prev.distance + d, geoFixes: prev.geoFixes + 1 }
                : prev
            )
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
            clearSimPending()
            startSimEngine()
            toast.info('GPS tidak tersedia — mode simulasi diaktifkan')
          }
          // TIME_OUT: watchPosition tetap berjalan menunggu fix berikutnya
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
      )
    }

    // GPS tidak kunjung fix dalam 15 detik -> fallback ke simulasi
    pendingSimRef.current = setTimeout(() => {
      pendingSimRef.current = null
      if (gpsModeRef.current === 'waiting') startSimEngine()
    }, 15000)

    toast.success('Perekaman perjalanan dimulai')
  }, [loc.pos, stopTrackingSensors, startSimEngine, clearSimPending])

  const finishTracking = useCallback(async () => {
    if (!tracking || !vehicle) return
    stopTrackingSensors()
    gpsModeRef.current = 'waiting'
    setLocMode('waiting')
    const duration = Math.max(1, Math.round((Date.now() - tracking.startedAt) / 1000))
    const distance = Math.round(tracking.distance * 100) / 100
    const pathJson =
      pathRef.current.length >= 2 ? JSON.stringify(pathRef.current) : null
    try {
      await api('/api/trips', 'POST', {
        vehicleId: vehicle.id,
        distance,
        duration,
        source: autoTrack ? 'auto' : 'manual',
        path: pathJson,
        startedAt: new Date(tracking.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
      })
      await loadState(vehicle.id)
      toast.success(`Perjalanan ${distance.toFixed(1).replace('.', ',')} km tersimpan`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan perjalanan')
    }
    setTracking(null)
    setLivePath([])
    setCurrentPos(null)
  }, [tracking, vehicle, autoTrack, loadState, stopTrackingSensors])

  useEffect(() => () => stopTrackingSensors(), [stopTrackingSensors])

  // ---------- Handlers ----------
  const switchVehicle = useCallback(
    async (id: string) => {
      setVehicleId(id)
      await loadState(id)
    },
    [loadState]
  )

  const patchComponent = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      await api(`/api/components/${id}`, 'PATCH', data)
      await loadState(vehicleId ?? undefined)
    },
    [loadState, vehicleId]
  )

  const installComponent = useCallback(
    async (c: ComponentDTO) => {
      try {
        await api(`/api/components/${c.id}`, 'PATCH', { action: 'install' })
        await loadState(vehicleId ?? undefined)
        toast.success(`${c.name} ditambahkan ke kendaraan`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menambah komponen')
      }
    },
    [loadState, vehicleId]
  )

  const removeComponent = useCallback(
    async (id: string) => {
      try {
        await api(`/api/components/${id}`, 'DELETE')
        setOpenDetailId(null)
        await loadState(vehicleId ?? undefined)
        toast.success('Komponen dilepas dari kendaraan')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal melepas komponen')
      }
    },
    [loadState, vehicleId]
  )

  const recordService = useCallback(
    async (componentId: string, data: { type: string; odometer: number; date: string; note: string }) => {
      await api(`/api/components/${componentId}/service`, 'POST', data)
      await loadState(vehicleId ?? undefined)
      toast.success('Servis berhasil dicatat')
    },
    [loadState, vehicleId]
  )

  const deleteTrip = useCallback(
    async (id: string) => {
      await api(`/api/trips/${id}`, 'DELETE')
      await loadState(vehicleId ?? undefined)
      toast.success('Perjalanan dihapus')
    },
    [loadState, vehicleId]
  )

  const addVehicle = useCallback(
    async (data: { name: string; type: string; odometer: number }) => {
      const res = await api<{ id: string }>('/api/vehicles', 'POST', data)
      await loadState(res.id)
      toast.success('Kendaraan ditambahkan')
    },
    [loadState]
  )

  const editVehicleSubmit = useCallback(
    async (id: string, data: { name?: string; odometer?: number }) => {
      await api(`/api/vehicles/${id}`, 'PATCH', data)
      await loadState(id)
      toast.success('Kendaraan diperbarui')
    },
    [loadState]
  )

  const deleteVehicle = useCallback(
    async (v: VehicleDTO) => {
      try {
        await api(`/api/vehicles/${v.id}`, 'DELETE')
        setEditVehicle(null)
        await loadState()
        toast.success('Kendaraan dihapus')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menghapus kendaraan')
      }
    },
    [loadState]
  )

  const resetData = useCallback(async () => {
    await api('/api/reset', 'POST')
    setSettingsOpen(false)
    setOpenDetailId(null)
    setView('kendaraan')
    await loadState()
    toast.success('Data demo diatur ulang')
  }, [loadState])

  const markSelectedGanti = useCallback(async () => {
    if (!vehicle) return
    const ids = Array.from(selectedIds)
    try {
      for (const id of ids) {
        await api(`/api/components/${id}/service`, 'POST', {
          type: 'ganti',
          odometer: vehicle.odometer,
          date: new Date().toISOString(),
        })
      }
      toast.success(`${ids.length} komponen ditandai sudah diganti`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    await loadState(vehicle.id)
  }, [selectedIds, vehicle, loadState])

  const toggleSelectComponent = useCallback((c: ComponentDTO) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(c.id)) next.delete(c.id)
      else next.add(c.id)
      return next
    })
  }, [])

  const toggleAutoTrack = useCallback(() => {
    setAutoTrack((prev) => {
      localStorage.setItem('rc-auto', prev ? '0' : '1')
      toast.success(prev ? 'Lacak otomatis dimatikan' : 'Lacak otomatis diaktifkan')
      return !prev
    })
  }, [])

  const toggleReminder = useCallback(() => {
    setReminder((prev) => {
      localStorage.setItem('rc-reminder', prev ? '0' : '1')
      if (!prev) toast.success('Pengingat otomatis diaktifkan')
      return !prev
    })
  }, [])

  const detailComponent =
    state?.components.find((c) => c.id === openDetailId) ?? null

  const manageComponent = useCallback(
    (c: ComponentDTO) => {
      if (c.installed) setOpenDetailId(c.id)
      else void installComponent(c)
    },
    [installComponent]
  )

  // ---------- Render ----------
  if (!state || !vehicle) {
    return (
      <div className="flex min-h-dvh justify-center bg-zinc-300/70">
        <div className="flex h-dvh w-full max-w-[430px] items-center justify-center bg-[#f2f3f5]">
          <div className="flex flex-col items-center gap-3">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            <p className="text-sm font-semibold text-zinc-500">Memuat RideCheck…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh justify-center bg-zinc-300/70">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f2f3f5] shadow-2xl">
        <main key={view} className="flex-1 overflow-y-auto overscroll-contain pb-36">
          {view === 'kendaraan' && (
            <Dashboard
              state={state}
              vehicle={vehicle}
              tab={tab}
              onTabChange={setTab}
              onOpenDetail={setOpenDetailId}
              onSwitchVehicle={switchVehicle}
              onOpenAddVehicle={() => setAddVehicleOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onEditOdometer={() => setOdoOpen(true)}
              onInstall={installComponent}
              onManageComponent={manageComponent}
              onSelectComponent={toggleSelectComponent}
              onToggleSelectMode={() => {
                setSelectMode((s) => {
                  if (s) setSelectedIds(new Set())
                  return !s
                })
              }}
              selectMode={selectMode}
              selectedIds={selectedIds}
              autoTrack={autoTrack}
              reminder={reminder}
              onToggleAutoTrack={toggleAutoTrack}
              onToggleReminder={toggleReminder}
            />
          )}

          {view === 'perjalanan' && (
            <TripsView
              state={state}
              vehicle={vehicle}
              tracking={tracking}
              autoTrack={autoTrack}
              onToggleAutoTrack={toggleAutoTrack}
              onStartTracking={startTracking}
              onFinishTracking={finishTracking}
              onDeleteTrip={deleteTrip}
              path={livePath}
              currentPos={currentPos}
              heading={heading}
              locMode={locMode}
              locStatus={loc.status}
              locError={loc.error}
              onRetryLocation={loc.refresh}
            />
          )}

          {view === 'riwayat' && (
            <HistoryView
              state={state}
              vehicle={vehicle}
              onOpenDetail={setOpenDetailId}
            />
          )}

          {view === 'bengkel' && <BengkelView />}
        </main>

        {/* Aksi seleksi komponen */}
        {selectMode && selectedIds.size > 0 && (
          <div className="absolute inset-x-4 bottom-24 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set())
                setSelectMode(false)
              }}
              aria-label="Batal memilih"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-lg"
            >
              <X size={20} />
            </button>
            <button
              type="button"
              onClick={markSelectedGanti}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-zinc-900 py-3.5 text-sm font-bold text-white shadow-xl active:scale-[0.98]"
            >
              <Wrench size={16} />
              Tandai Sudah Diganti ({selectedIds.size})
            </button>
          </div>
        )}

        <BottomNav
          view={view}
          onChange={setView}
          onSearch={() => setSearchOpen(true)}
        />

        {/* PWA: service worker + tombol instal aplikasi */}
        <ServiceWorkerRegister />
        <InstallPrompt />

        {/* Overlay detail komponen */}
        <AnimatePresence>
          {detailComponent && (
            <ComponentDetail
              key={detailComponent.id}
              component={detailComponent}
              records={state.records}
              vehicle={vehicle}
              onBack={() => setOpenDetailId(null)}
              onPatch={(data) => patchComponent(detailComponent.id, data)}
              onOpenService={() => setServiceFor(detailComponent)}
              onRemove={() => removeComponent(detailComponent.id)}
            />
          )}
        </AnimatePresence>

        {/* Overlay pencarian */}
        <AnimatePresence>
          {searchOpen && (
            <SearchOverlay
              state={state}
              bengkel={BENGKEL_LIST}
              onClose={() => setSearchOpen(false)}
              onOpenDetail={(id) => {
                setSearchOpen(false)
                setOpenDetailId(id)
              }}
              onGoTo={(v) => {
                setSearchOpen(false)
                setView(v)
              }}
              onSwitchVehicle={(id) => {
                setSearchOpen(false)
                void switchVehicle(id)
                setView('kendaraan')
              }}
            />
          )}
        </AnimatePresence>

        {/* Sheets & dialogs */}
        <SettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          vehicles={state.vehicles}
          currentVehicleId={vehicle.id}
          onAddVehicle={() => {
            setSettingsOpen(false)
            setAddVehicleOpen(true)
          }}
          onEditVehicle={(v) => {
            setSettingsOpen(false)
            setEditVehicle(v)
          }}
          onDeleteVehicle={deleteVehicle}
          onResetData={resetData}
        />

        <AddVehicleDialog
          open={addVehicleOpen}
          onClose={() => setAddVehicleOpen(false)}
          onSubmit={addVehicle}
        />

        <OdometerDialog
          open={odoOpen}
          onClose={() => setOdoOpen(false)}
          vehicle={vehicle}
          onSubmit={(odometer) => editVehicleSubmit(vehicle.id, { odometer })}
        />

        <EditVehicleDialog
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onSubmit={editVehicleSubmit}
        />

        <ServiceDialog
          open={!!serviceFor}
          onClose={() => setServiceFor(null)}
          componentName={serviceFor?.name ?? ''}
          currentOdometer={vehicle.odometer}
          onSubmit={(data) => recordService(serviceFor!.id, data)}
        />
      </div>
    </div>
  )
}
