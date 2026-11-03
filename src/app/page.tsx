'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Bell,
  BellRing,
  Bike,
  ChevronDown,
  CircleDollarSign,
  Fuel,
  Plus,
  Search,
  Wrench,
  X,
} from 'lucide-react'
import type { AppState, ComponentDTO, ExpenseDTO, TripDTO, VehicleDTO } from '@/lib/state'
import { BENGKEL_LIST } from '@/lib/bengkel'
import { bearingDeg, haversineKm, type LatLng } from '@/lib/geo'
import { useLocation } from '@/lib/use-location'
import { statusLabel } from '@/lib/status'
import { BottomNav, type View } from '@/components/rc/nav'
import {
  Btn,
  Card,
  Field,
  IconBtn,
  Pill,
  Sheet,
  statusTone,
  inputCls,
  selectCls,
  formatRupiah,
  type QuickAction,
  type TrackingState,
} from '@/components/rc/ui'
import { HomeView } from '@/components/rc/home-view'
import { RideView } from '@/components/rc/ride-view'
import { AuthView, type AuthUser } from '@/components/rc/auth-view'
import { MaintenanceView } from '@/components/rc/maintenance-view'
import { VehicleView } from '@/components/rc/vehicle-view'
import { HistoryView } from '@/components/rc/history-view'
import { SettingsView } from '@/components/rc/settings-view'
import { ComponentDetail } from '@/components/ridecheck/component-detail'
import { BengkelView } from '@/components/ridecheck/bengkel-view'
import { SearchOverlay } from '@/components/ridecheck/search-overlay'
import { ServiceWorkerRegister, InstallPrompt } from '@/components/ridecheck/pwa'

async function api<T = unknown>(path: string, method: string, body?: unknown): Promise<T> {
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

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 4 && h < 11) return 'Selamat pagi'
  if (h >= 11 && h < 15) return 'Selamat siang'
  if (h >= 15 && h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function todayInput(): string {
  const d = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Cache state terakhir di perangkat — agar aplikasi terbuka instan tanpa spinner. */
const STATE_CACHE_KEY = 'mm-state-cache'

function readStateCache(): AppState | null {
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AppState
    if (data && data.vehicle && Array.isArray(data.components) && Array.isArray(data.vehicles)) {
      return data
    }
  } catch {
    /* cache rusak — abaikan */
  }
  return null
}

function writeStateCache(data: AppState) {
  try {
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(data))
  } catch {
    /* penyimpanan penuh — abaikan */
  }
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Rider'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'MM'
  const first = parts[0][0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : parts[0][1] ?? ''
  return (first + second).toUpperCase()
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [state, setState] = useState<AppState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [view, setView] = useState<View>('home')

  // Overlays & sheets
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<VehicleDTO | null>(null)
  const [odoOpen, setOdoOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState<{ open: boolean; componentId: string | null }>({ open: false, componentId: null })
  const [tripOpen, setTripOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)

  // Lokasi GPS asli (jangan fallback diam-diam ke Jakarta)
  const loc = useLocation()

  // Select mode (perawatan)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Chips
  const [autoTrack, setAutoTrack] = useState(false)
  const [reminder, setReminder] = useState(true)

  // Tracking — 100% GPS asli, tanpa mode simulasi. GPS wajib aktif untuk merekam.
  const [tracking, setTracking] = useState<TrackingState | null>(null)
  const watchRef = useRef<number | null>(null)
  const lastPosRef = useRef<LatLng | null>(null)
  const pathRef = useRef<[number, number][]>([])
  const headingRef = useRef(0)
  const [livePath, setLivePath] = useState<[number, number][]>([])
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null)
  const [heading, setHeading] = useState(0)
  const [, setTick] = useState(0)
  const [locMode, setLocMode] = useState<'waiting' | 'gps'>('waiting')

  // ---------- Data ----------
  const loadState = useCallback(async (id?: string) => {
    const res = await fetch(id ? `/api/state?vehicleId=${id}` : '/api/state', { cache: 'no-store' })
    if (!res.ok) throw new Error('Gagal memuat data')
    const data: AppState = await res.json()
    if (!data || !Array.isArray(data.components) || !Array.isArray(data.vehicles)) {
      throw new Error('Data tidak valid')
    }
    setState(data)
    setLoadError(null)
    if (data.vehicle) setVehicleId(data.vehicle.id)
    writeStateCache(data)
  }, [])

  // ---------- Auth ----------
  useEffect(() => {
    let alive = true
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { user: AuthUser | null }) => {
        if (alive && d?.user) setUser(d.user)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setAuthReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* tetap keluar di sisi klien */
    }
    try {
      localStorage.removeItem(STATE_CACHE_KEY)
    } catch {
      /* abaikan */
    }
    setUser(null)
    setState(null)
    setLoadError(null)
    setView('home')
    setSettingsOpen(false)
  }, [])

  const hydratedRef = useRef(false)
  useEffect(() => {
    if (!user) return
    // Hidrasi instan dari cache perangkat — tampilan langsung terbuka tanpa loading
    const cached = readStateCache()
    if (cached) {
      hydratedRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrasi dari cache lokal (sistem eksternal)
      setState(cached)
      if (cached.vehicle) setVehicleId(cached.vehicle.id)
    }
    // Sinkronisasi segar di latar belakang — UI diperbarui diam-diam bila ada perubahan
    loadState().catch((e) => {
      if (!hydratedRef.current) {
        const msg = e instanceof Error ? e.message : 'Gagal memuat data'
        setLoadError(msg)
        toast.error(msg)
      }
    })
  }, [user, loadState])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- baca preferensi tersimpan dari localStorage (sistem eksternal)
    setAutoTrack(localStorage.getItem('rc-auto') === '1')
    setReminder(localStorage.getItem('rc-reminder') !== '0')
  }, [])

  // Deep-link dari shortcut PWA: /?view=perjalanan|bengkel|riwayat|kendaraan
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    const map: Record<string, View> = {
      perjalanan: 'ride',
      bengkel: 'bengkel',
      riwayat: 'history',
      kendaraan: 'vehicle',
      home: 'home',
    }
    if (v && map[v]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deep-link dari URL shortcut PWA (sistem eksternal)
      setView(map[v])
    }
  }, [])

  // tick re-render saat tracking aktif
  useEffect(() => {
    if (!tracking) return
    const i = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(i)
  }, [tracking?.startedAt, tracking])

  // Reset scroll saat pindah halaman
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  const vehicle = state?.vehicle ?? null

  // ---------- Tracking — hanya GPS asli, tanpa simulasi ----------
  const stopTrackingSensors = useCallback(() => {
    if (watchRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }, [])

  const abortTrackingUi = useCallback(() => {
    setTracking(null)
    setLivePath([])
    setCurrentPos(null)
    setHeading(0)
    setLocMode('waiting')
  }, [])

  const startTracking = useCallback(() => {
    // GPS wajib aktif — tanpa GPS fitur rekam tidak bisa dipakai
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Perangkat tidak mendukung GPS — nyalakan layanan lokasi dulu')
      return
    }
    if (loc.status === 'denied') {
      toast.error('Izin lokasi belum diberikan — nyalakan GPS dulu untuk merekam perjalanan')
      return
    }
    stopTrackingSensors()
    lastPosRef.current = null
    pathRef.current = []
    headingRef.current = 0
    setLocMode('waiting')
    if (loc.pos) {
      pathRef.current = [[loc.pos.lat, loc.pos.lng]]
      setLivePath(pathRef.current)
      setCurrentPos([loc.pos.lat, loc.pos.lng])
    } else {
      setLivePath([])
      setCurrentPos(null)
    }
    setTracking({ startedAt: Date.now(), distance: 0, geoFixes: 0 })

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        if (!Number.isFinite(cur.lat) || !Number.isFinite(cur.lng)) return
        if (lastPosRef.current === null) {
          setLocMode('gps')
          pathRef.current = [[cur.lat, cur.lng]]
          setLivePath(pathRef.current)
          setCurrentPos([cur.lat, cur.lng])
          lastPosRef.current = cur
          setTracking((prev) => (prev ? { ...prev, distance: 0, geoFixes: 1 } : prev))
          return
        }
        const last = lastPosRef.current
        lastPosRef.current = cur
        setCurrentPos([cur.lat, cur.lng])
        const acc = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 0
        const d = haversineKm(last, cur)
        if (acc > 100 || d >= 1) return
        if (d > 0.003) {
          headingRef.current = bearingDeg(last, cur)
          setHeading(headingRef.current)
          if (pathRef.current.length < 2500) {
            pathRef.current = [...pathRef.current, [cur.lat, cur.lng] as [number, number]]
            setLivePath(pathRef.current)
          }
          setTracking((prev) =>
            prev ? { ...prev, distance: prev.distance + d, geoFixes: prev.geoFixes + 1 } : prev
          )
        }
      },
      (err) => {
        // Izin dicabut di tengah rekam → hentikan. Error lain (GPS hilang sesaat)
        // tidak menghentikan watch — biarkan mencari sinyal lagi.
        if (err.code === err.PERMISSION_DENIED) {
          stopTrackingSensors()
          abortTrackingUi()
          toast.error('Akses lokasi dimatikan — rekaman dihentikan')
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    )

    toast.success('Mencari sinyal GPS — perekaman dimulai')
  }, [loc.pos, loc.status, stopTrackingSensors, abortTrackingUi])

  const finishTracking = useCallback(async () => {
    if (!tracking || !vehicle) return
    stopTrackingSensors()
    setLocMode('waiting')
    const duration = Math.max(1, Math.round((Date.now() - tracking.startedAt) / 1000))
    const distance = Math.round(tracking.distance * 100) / 100
    // Tanpa satu pun titik GPS = tidak ada data nyata → jangan simpan perjalanan kosong
    if (tracking.geoFixes === 0 || distance < 0.01) {
      abortTrackingUi()
      toast.error('Belum ada data GPS — perjalanan tidak disimpan. Nyalakan GPS lalu coba lagi.')
      return
    }
    const pathJson = pathRef.current.length >= 2 ? JSON.stringify(pathRef.current) : null
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
    abortTrackingUi()
  }, [tracking, vehicle, autoTrack, loadState, stopTrackingSensors, abortTrackingUi])

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
    async (
      componentId: string,
      data: { type: string; odometer: number; date: string; note: string; cost?: number | null; workshop?: string | null }
    ) => {
      await api(`/api/components/${componentId}/service`, 'POST', data)
      await loadState(vehicleId ?? undefined)
      toast.success('Servis berhasil dicatat')
    },
    [loadState, vehicleId]
  )

  const deleteTrip = useCallback(
    (id: string) => {
      const prev = state
      // Hapus optimis — daftar langsung diperbarui tanpa menunggu server
      setState((s) => (s ? { ...s, trips: s.trips.filter((t) => t.id !== id) } : s))
      void (async () => {
        try {
          await api(`/api/trips/${id}`, 'DELETE')
          toast.success('Perjalanan dihapus')
        } catch (e) {
          setState(prev) // gagal → kembalikan seperti semula
          toast.error(e instanceof Error ? e.message : 'Gagal menghapus perjalanan')
        }
      })()
    },
    [state]
  )

  const addManualTrip = useCallback(
    (data: { distance: number; date: string; note?: string }) => {
      if (!vehicle) return
      const d = new Date(`${data.date}T09:00:00`)
      const iso = d.toISOString()
      const prev = state
      // Tambah optimis — perjalanan baru langsung muncul, sinkron server di belakang
      const temp: TripDTO = {
        id: `tmp-${Date.now()}`,
        distance: data.distance,
        duration: 0,
        startOdo: vehicle.odometer,
        endOdo: vehicle.odometer,
        source: 'manual',
        path: null,
        startedAt: iso,
        endedAt: iso,
      }
      setState((s) => (s ? { ...s, trips: [temp, ...s.trips] } : s))
      void (async () => {
        try {
          await api('/api/trips', 'POST', {
            vehicleId: vehicle.id,
            distance: data.distance,
            duration: 0,
            source: 'manual',
            startedAt: iso,
            endedAt: iso,
          })
          await loadState(vehicle.id) // ganti entri sementara dengan data asli
          toast.success('Perjalanan dicatat')
        } catch (e) {
          setState(prev) // gagal → hapus entri sementara
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan perjalanan')
        }
      })()
    },
    [state, vehicle, loadState]
  )

  const addExpense = useCallback(
    (data: { category: string; amount: number; date: string; note?: string; liters?: number | null }) => {
      if (!vehicle) return
      const d = new Date(`${data.date}T09:00:00`)
      const iso = d.toISOString()
      const prev = state
      // Tambah optimis — pengeluaran langsung muncul di daftar
      const temp: ExpenseDTO = {
        id: `tmp-${Date.now()}`,
        category: data.category,
        amount: data.amount,
        note: data.note ?? null,
        liters: data.liters ?? null,
        date: iso,
      }
      setState((s) => (s ? { ...s, expenses: [temp, ...s.expenses] } : s))
      void (async () => {
        try {
          await api('/api/expenses', 'POST', {
            vehicleId: vehicle.id,
            category: data.category,
            amount: data.amount,
            date: iso,
            note: data.note ?? null,
            liters: data.liters ?? null,
          })
          await loadState(vehicle.id) // sinkron data asli dari server
          toast.success('Pengeluaran dicatat')
        } catch (e) {
          setState(prev) // gagal → hapus entri sementara
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan pengeluaran')
        }
      })()
    },
    [state, vehicle, loadState]
  )

  const deleteExpense = useCallback(
    (id: string) => {
      const prev = state
      // Hapus optimis — UI langsung merespons
      setState((s) => (s ? { ...s, expenses: s.expenses.filter((e) => e.id !== id) } : s))
      void (async () => {
        try {
          await api(`/api/expenses/${id}`, 'DELETE')
          toast.success('Pengeluaran dihapus')
        } catch (e) {
          setState(prev) // gagal → kembalikan
          toast.error(e instanceof Error ? e.message : 'Gagal menghapus pengeluaran')
        }
      })()
    },
    [state]
  )

  const addVehicle = useCallback(
    async (data: { name: string; type: string; plate?: string; odometer: number }) => {
      const res = await api<{ id: string }>('/api/vehicles', 'POST', data)
      await loadState(res.id)
      toast.success('Kendaraan ditambahkan')
    },
    [loadState]
  )

  const editVehicleSubmit = useCallback(
    async (id: string, data: { name?: string; plate?: string; odometer?: number }) => {
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
        setSwitcherOpen(false)
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
    setView('home')
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

  const detailComponent = state?.components?.find((c) => c.id === openDetailId) ?? null

  // ---------- Quick actions ----------
  const onQuickAction = useCallback(
    (a: QuickAction) => {
      if (a === 'trip') setTripOpen(true)
      else if (a === 'service') setServiceOpen({ open: true, componentId: null })
      else if (a === 'expense') setExpenseOpen(true)
      else if (a === 'history') setView('history')
      else if (a === 'odometer') setOdoOpen(true)
    },
    []
  )

  const dueComponents = useMemo(
    () =>
      (state?.components ?? []).filter(
        (c) => c.installed && c.health && c.health.status !== 'sehat'
      ),
    [state?.components]
  )

  // ---------- Render: auth gate, loading & error ----------
  if (!authReady) {
    return (
      <div className="flex min-h-dvh justify-center bg-background">
        <div className="flex h-dvh w-full max-w-[520px] flex-col items-center justify-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-lime border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthView onAuthed={(u) => setUser(u)} />
  }

  if (loadError && !state) {
    return (
      <div className="flex min-h-dvh justify-center bg-background">
        <div className="flex h-dvh w-full max-w-[520px] flex-col items-center justify-center px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-2xl">⚠️</span>
          <p className="mt-4 text-base font-extrabold text-foreground">Gagal memuat data</p>
          <p className="mt-1 text-sm text-muted-foreground">Periksa koneksi internet kamu lalu coba lagi.</p>
          <Btn
            variant="lime"
            className="mt-5"
            onClick={() => {
              setLoadError(null)
              loadState().catch(() => {})
            }}
          >
            Coba Lagi
          </Btn>
        </div>
      </div>
    )
  }

  if (!state || !vehicle) {
    return (
      <div className="flex min-h-dvh justify-center bg-background">
        <div className="flex h-dvh w-full max-w-[520px] flex-col items-center justify-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-lime border-t-transparent" />
          <p className="text-sm font-bold text-muted-foreground">Memuat MotoMate…</p>
        </div>
      </div>
    )
  }

  const dateLine = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div className="flex min-h-dvh justify-center bg-background">
      <div className="relative flex w-full max-w-[520px] flex-col">
        {/* ---------- Header ---------- */}
        <header className="sticky top-0 z-30 bg-background/90 px-5 pb-3 pt-5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="press flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left"
              aria-label="Ganti kendaraan"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime">
                <Bike size={20} className="text-on-lime" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-extrabold leading-tight text-foreground">
                  {greeting()}, {firstName(user.name)}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <span className="truncate">{vehicle.name}</span>
                  <ChevronDown size={12} className="shrink-0" />
                </span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <IconBtn label="Cari" tone="card" className="h-10 w-10" onClick={() => setSearchOpen(true)}>
                <Search size={18} />
              </IconBtn>
              <IconBtn label="Notifikasi" tone="card" className="h-10 w-10" onClick={() => setNotifOpen(true)}>
                {dueComponents.length > 0 ? <BellRing size={18} /> : <Bell size={18} />}
              </IconBtn>
              <IconBtn label="Profil & pengaturan" tone="dark" className="h-10 w-10" onClick={() => setSettingsOpen(true)}>
                <span className="text-[13px] font-extrabold">{initials(user.name)}</span>
              </IconBtn>
            </div>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 px-1">
            <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold text-muted-foreground">{dateLine}</span>
            <Pill tone={dueComponents.length > 0 ? 'red' : 'lime'} className="min-w-0 max-w-full truncate">
              {dueComponents.length > 0 ? `${dueComponents.length} komponen perlu perhatian` : 'Semua komponen sehat'}
            </Pill>
          </div>
        </header>

        {/* ---------- Konten ---------- */}
        <main className="flex-1 px-5 pb-36">
          {/* Tanpa transisi antar halaman — pindah tab langsung tampil agar terasa instan */}
          <div key={view}>
              {view === 'home' && (
                <HomeView
                  vehicle={vehicle}
                  components={state.components}
                  trips={state.trips}
                  records={state.records}
                  expenses={state.expenses}
                  onQuickAction={onQuickAction}
                  onOpenBengkel={() => setView('bengkel')}
                  onOpenDetail={setOpenDetailId}
                />
              )}

              {view === 'ride' && (
                <RideView
                  vehicle={vehicle}
                  trips={state.trips}
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
                  onAddManual={() => setTripOpen(true)}
                  onAddExpense={() => setExpenseOpen(true)}
                  onOpenHistory={() => setView('history')}
                />
              )}

              {view === 'maint' && (
                <MaintenanceView
                  vehicle={vehicle}
                  components={state.components}
                  records={state.records}
                  onOpenDetail={setOpenDetailId}
                  onOpenService={(c) => setServiceOpen({ open: true, componentId: c.id })}
                  onInstall={installComponent}
                  onOpenBengkel={() => setView('bengkel')}
                  selectMode={selectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectComponent}
                  onToggleSelectMode={() => {
                    if (selectMode) setSelectedIds(new Set())
                    setSelectMode(!selectMode)
                  }}
                  onMarkSelected={markSelectedGanti}
                />
              )}

              {view === 'vehicle' && (
                <VehicleView
                  vehicle={vehicle}
                  vehicles={state.vehicles}
                  components={state.components}
                  records={state.records}
                  trips={state.trips}
                  onEditOdometer={() => setOdoOpen(true)}
                  onEditVehicle={() => setEditVehicle(vehicle)}
                  onAddVehicle={() => setAddVehicleOpen(true)}
                  onSwitchVehicle={switchVehicle}
                  onOpenDetail={setOpenDetailId}
                  onOpenHistory={() => setView('history')}
                />
              )}

              {view === 'history' && (
                <HistoryView
                  vehicle={vehicle}
                  components={state.components}
                  records={state.records}
                  trips={state.trips}
                  expenses={state.expenses}
                  onBack={() => setView('home')}
                  onOpenDetail={setOpenDetailId}
                  onDeleteExpense={deleteExpense}
                />
              )}

              {view === 'bengkel' && <BengkelView onBack={() => setView('home')} />}
          </div>
        </main>

        {/* Aksi seleksi komponen */}
        {view === 'maint' && selectMode && selectedIds.size > 0 && (
          <div className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-5">
            <div className="flex w-full max-w-[430px] items-center gap-2">
              <IconBtn
                label="Batal memilih"
                tone="card"
                onClick={() => {
                  setSelectedIds(new Set())
                  setSelectMode(false)
                }}
              >
                <X size={20} />
              </IconBtn>
              <Btn variant="lime" className="flex-1" onClick={markSelectedGanti}>
                <Wrench size={16} /> Tandai Sudah Diganti ({selectedIds.size})
              </Btn>
            </div>
          </div>
        )}

        <BottomNav view={view} onChange={setView} />

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
              onOpenService={() => setServiceOpen({ open: true, componentId: detailComponent.id })}
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
                const map: Record<string, View> = {
                  perjalanan: 'ride',
                  bengkel: 'bengkel',
                  riwayat: 'history',
                  kendaraan: 'vehicle',
                }
                setView(map[v] ?? 'home')
              }}
              onSwitchVehicle={(id) => {
                setSearchOpen(false)
                void switchVehicle(id)
                setView('vehicle')
              }}
            />
          )}
        </AnimatePresence>

        {/* ---------- Sheets ---------- */}
        <VehicleSwitcherSheet
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          vehicles={state.vehicles}
          currentId={vehicle.id}
          onSwitch={(id) => {
            setSwitcherOpen(false)
            void switchVehicle(id)
          }}
          onAdd={() => {
            setSwitcherOpen(false)
            setAddVehicleOpen(true)
          }}
        />

        <NotificationsSheet
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          due={dueComponents}
          onOpenDetail={(id) => {
            setNotifOpen(false)
            setOpenDetailId(id)
          }}
        />

        <VehicleFormSheet
          open={addVehicleOpen}
          onClose={() => setAddVehicleOpen(false)}
          onSubmit={addVehicle}
        />

        <VehicleFormSheet
          open={!!editVehicle}
          onClose={() => setEditVehicle(null)}
          vehicle={editVehicle ?? undefined}
          onSubmit={async (data) => {
            if (editVehicle) await editVehicleSubmit(editVehicle.id, data)
          }}
          onDelete={() => {
            if (editVehicle) {
              if (window.confirm(`Hapus ${editVehicle.name}? Riwayat terkait juga akan terhapus.`)) {
                deleteVehicle(editVehicle)
              }
            }
          }}
        />

        <OdometerSheet
          open={odoOpen}
          onClose={() => setOdoOpen(false)}
          vehicle={vehicle}
          onSubmit={(km) => editVehicleSubmit(vehicle.id, { odometer: km })}
        />

        <ServiceSheet
          open={serviceOpen.open}
          componentId={serviceOpen.componentId}
          components={state.components.filter((c) => c.installed)}
          odometer={vehicle.odometer}
          onClose={() => setServiceOpen({ open: false, componentId: null })}
          onSubmit={(id, data) => recordService(id, data)}
        />

        <ManualTripSheet
          open={tripOpen}
          onClose={() => setTripOpen(false)}
          onSubmit={addManualTrip}
        />

        <ExpenseSheet
          open={expenseOpen}
          onClose={() => setExpenseOpen(false)}
          onSubmit={addExpense}
        />

        {/* Settings */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-background"
            >
              <SettingsView
                user={user}
                vehicles={state.vehicles}
                currentVehicleId={vehicle.id}
                reminder={reminder}
                onToggleReminder={toggleReminder}
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
                onLogout={logout}
                onBack={() => setSettingsOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ================= Sheets =================

function VehicleSwitcherSheet({
  open,
  onClose,
  vehicles,
  currentId,
  onSwitch,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  vehicles: VehicleDTO[]
  currentId: string
  onSwitch: (id: string) => void
  onAdd: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Kendaraan Saya">
      <div className="flex flex-col gap-2">
        {vehicles.map((v) => (
          <Card
            key={v.id}
            onClick={() => onSwitch(v.id)}
            className={v.id === currentId ? 'border-lime bg-lime/10' : ''}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold">{v.name}</p>
                <p className="text-[12px] font-semibold text-muted-foreground">
                  {v.type === 'mobil' ? 'Mobil' : 'Motor'}
                  {v.plate ? ` · ${v.plate}` : ''} · {v.odometer.toLocaleString('id-ID')} km
                </p>
              </div>
              {v.id === currentId && <Pill tone="lime">Aktif</Pill>}
            </div>
          </Card>
        ))}
        <Btn variant="outline" className="mt-2" onClick={onAdd}>
          <Plus size={16} /> Tambah Kendaraan
        </Btn>
      </div>
    </Sheet>
  )
}

function NotificationsSheet({
  open,
  onClose,
  due,
  onOpenDetail,
}: {
  open: boolean
  onClose: () => void
  due: ComponentDTO[]
  onOpenDetail: (id: string) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Notifikasi">
      {due.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-on-lime">
            <Bell size={22} />
          </span>
          <p className="text-sm font-extrabold">Tidak ada notifikasi</p>
          <p className="max-w-[240px] text-[13px] text-muted-foreground">
            Semua komponen dalam kondisi sehat. Pertahankan!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[12px] font-semibold text-muted-foreground">
            {due.length} komponen perlu perhatian
          </p>
          {due.map((c) => (
            <Card key={c.id} onClick={() => onOpenDetail(c.id)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{c.name}</p>
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    {c.health && c.health.kmRemaining > 0
                      ? `Sisa ${c.health.kmRemaining.toLocaleString('id-ID')} km`
                      : 'Sudah melewati jadwal'}
                  </p>
                </div>
                <Pill tone={statusTone(c.health?.status ?? 'sehat')}>{statusLabel(c.health?.status ?? 'sehat')}</Pill>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function VehicleFormSheet({
  open,
  onClose,
  vehicle,
  onSubmit,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  vehicle?: VehicleDTO
  onSubmit: (data: { name: string; type: string; plate?: string; odometer: number }) => Promise<void>
  onDelete?: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('motor')
  const [plate, setPlate] = useState('')
  const [odometer, setOdometer] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(vehicle?.name ?? '')
      setType(vehicle?.type ?? 'motor')
      setPlate(vehicle?.plate ?? '')
      setOdometer(vehicle ? String(vehicle.odometer) : '')
    }
  }, [open, vehicle])

  const submit = async () => {
    const km = Math.round(Number(odometer) || 0)
    if (!name.trim()) return toast.error('Nama kendaraan wajib diisi')
    if (km < 0) return toast.error('Odometer tidak valid')
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), type, plate: plate.trim() || undefined, odometer: km })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={vehicle ? 'Ubah Kendaraan' : 'Tambah Kendaraan'}>
      <div className="flex flex-col gap-4">
        <Field label="Nama kendaraan">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Si Ganteng Ireng" />
        </Field>
        <Field label="Jenis">
          <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)} disabled={!!vehicle}>
            <option value="motor">Motor</option>
            <option value="mobil">Mobil</option>
          </select>
        </Field>
        <Field label="Nomor polisi" hint="Opsional, cth. B 1234 XYZ">
          <input className={inputCls} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="B 1234 XYZ" />
        </Field>
        <Field label="Odometer (km)">
          <input className={inputCls} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
        </Field>
        <Btn variant="lime" full onClick={submit} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </Btn>
        {vehicle && onDelete && (
          <Btn variant="danger" full onClick={onDelete}>
            Hapus Kendaraan
          </Btn>
        )}
      </div>
    </Sheet>
  )
}

function OdometerSheet({
  open,
  onClose,
  vehicle,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  vehicle: VehicleDTO
  onSubmit: (km: number) => Promise<void>
}) {
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) setVal(String(vehicle.odometer))
  }, [open, vehicle])

  const submit = async () => {
    const km = Math.round(Number(val) || 0)
    if (km < vehicle.odometer) {
      return toast.error(`Odometer tidak boleh lebih kecil dari ${vehicle.odometer.toLocaleString('id-ID')} km`)
    }
    setSaving(true)
    try {
      await onSubmit(km)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Perbarui Odometer">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted-foreground">
          Masukkan kilometer terbaru dari spidometer {vehicle.name}.
        </p>
        <Field label="Kilometer sekarang" hint={`Sebelumnya: ${vehicle.odometer.toLocaleString('id-ID')} km`}>
          <input
            className={inputCls}
            inputMode="numeric"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0"
          />
        </Field>
        <Btn variant="lime" full onClick={submit} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan Odometer'}
        </Btn>
      </div>
    </Sheet>
  )
}

function ServiceSheet({
  open,
  componentId,
  components,
  odometer,
  onClose,
  onSubmit,
}: {
  open: boolean
  componentId: string | null
  components: ComponentDTO[]
  odometer: number
  onClose: () => void
  onSubmit: (
    id: string,
    data: { type: string; odometer: number; date: string; note: string; cost?: number | null; workshop?: string | null }
  ) => Promise<void>
}) {
  const [compId, setCompId] = useState(componentId ?? '')
  const [type, setType] = useState('ganti')
  const [odo, setOdo] = useState(String(odometer))
  const [date, setDate] = useState(todayInput())
  const [cost, setCost] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setCompId(componentId ?? components[0]?.id ?? '')
      setOdo(String(odometer))
      setDate(todayInput())
      setCost('')
      setWorkshop('')
      setNote('')
      setType('ganti')
    }
  }, [open])

  const submit = async () => {
    if (!compId) return toast.error('Pilih komponen dulu')
    const km = Math.round(Number(odo) || 0)
    if (km <= 0) return toast.error('Odometer wajib diisi')
    setSaving(true)
    try {
      await onSubmit(compId, {
        type,
        odometer: km,
        date: new Date(`${date}T09:00:00`).toISOString(),
        note: note.trim(),
        cost: cost ? Math.round(Number(cost) || 0) : null,
        workshop: workshop.trim() || null,
      })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat servis')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Catat Servis">
      <div className="flex flex-col gap-4">
        <Field label="Komponen">
          <select className={selectCls} value={compId} onChange={(e) => setCompId(e.target.value)}>
            {components.length === 0 && <option value="">Tidak ada komponen terpasang</option>}
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(['ganti', 'servis'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`press min-h-11 rounded-2xl border text-sm font-bold ${
                type === t ? 'border-lime bg-lime text-on-lime' : 'border-input bg-card text-muted-foreground'
              }`}
            >
              {t === 'ganti' ? 'Ganti Komponen' : 'Servis / Tune Up'}
            </button>
          ))}
        </div>
        <Field label="Kilometer saat servis">
          <input className={inputCls} inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value.replace(/[^\d]/g, ''))} />
        </Field>
        <Field label="Tanggal servis">
          <input type="date" className={inputCls} value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Biaya (Rp)" hint="Opsional">
          <input className={inputCls} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ''))} placeholder="cth. 85000" />
        </Field>
        <Field label="Bengkel" hint="Opsional">
          <input className={inputCls} value={workshop} onChange={(e) => setWorkshop(e.target.value)} placeholder="cth. AHASS Motor Cerdas" />
        </Field>
        <Field label="Catatan" hint="Opsional">
          <textarea className={`${inputCls} min-h-20 py-3`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth. Oli 0.8L, filter baru" />
        </Field>
        <Btn variant="lime" full onClick={submit} disabled={saving || components.length === 0}>
          {saving ? 'Menyimpan…' : 'Simpan Catatan Servis'}
        </Btn>
      </div>
    </Sheet>
  )
}

function ManualTripSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: { distance: number; date: string; note?: string }) => Promise<void>
}) {
  const [distance, setDistance] = useState('')
  const [date, setDate] = useState(todayInput())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDistance('')
      setDate(todayInput())
      setNote('')
    }
  }, [open])

  const submit = async () => {
    const d = Number(distance)
    if (!d || d <= 0) return toast.error('Jarak harus lebih dari 0 km')
    setSaving(true)
    try {
      await onSubmit({ distance: Math.round(d * 10) / 10, date, note: note.trim() || undefined })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Catat Perjalanan">
      <div className="flex flex-col gap-4">
        <Field label="Jarak (km)">
          <input className={inputCls} inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="cth. 12,5" />
        </Field>
        <Field label="Tanggal">
          <input type="date" className={inputCls} value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Catatan" hint="Opsional, cth. Pulang kampung">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Btn variant="lime" full onClick={submit} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan Perjalanan'}
        </Btn>
      </div>
    </Sheet>
  )
}

/** Kapasitas tangki default (dapat diatur pengguna, tersimpan di perangkat). */
const DEFAULT_TANK_L = 5

function ExpenseSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    category: string
    amount: number
    date: string
    note?: string
    liters?: number | null
  }) => Promise<void> | void
}) {
  const [category, setCategory] = useState('bensin')
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [tank, setTank] = useState('5')
  const [date, setDate] = useState(todayInput())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setCategory('bensin')
      setAmount('')
      setLiters('')
      setDate(todayInput())
      setNote('')
      // Kapasitas tangki tersimpan di perangkat — default 5 liter
      setTank(localStorage.getItem('mm-tank') || '5')
    }
  }, [open])

  const tankL = Math.max(1, Math.min(30, Number(tank) || DEFAULT_TANK_L))

  // Tombol liter bulat 1..kapasitas tangki — tanpa pecahan (1, 2, 3, 4, 5 L)
  const literOptions = Array.from({ length: tankL }, (_, i) => i + 1)

  const submit = () => {
    const amt = Math.round(Number(amount) || 0)
    if (amt <= 0) return toast.error('Nominal harus lebih dari 0')
    let ltr: number | null = null
    if (category === 'bensin' && liters.trim()) {
      ltr = Math.round(Number(liters) * 100) / 100
      if (!ltr || ltr <= 0) return toast.error('Jumlah liter tidak valid')
    }
    setSaving(true)
    try {
      void onSubmit({
        category,
        amount: amt,
        date,
        note: note.trim() || undefined,
        liters: ltr,
      })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const cats = [
    { key: 'bensin', label: 'Bensin', icon: Fuel },
    { key: 'servis', label: 'Servis', icon: Wrench },
  ]

  const ltrNum = Number(liters) || 0
  const amtNum = Number(amount) || 0
  const perLiter = ltrNum > 0 && amtNum > 0 ? Math.round(amtNum / ltrNum) : null

  return (
    <Sheet open={open} onClose={onClose} title="Tambah Pengeluaran">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {cats.map((c) => {
            const Icon = c.icon
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border text-sm font-bold ${
                  category === c.key
                    ? 'border-lime bg-lime text-on-lime'
                    : 'border-input bg-card text-muted-foreground'
                }`}
              >
                <Icon size={16} /> {c.label}
              </button>
            )
          })}
        </div>

        {category === 'bensin' && (
          <>
            <Field label="Berapa liter?" hint={`Tombol menyesuaikan kapasitas tangki (${tankL} L) — bisa diubah di bawah`}>
              <div className="grid grid-cols-5 gap-2">
                {literOptions.map((n) => {
                  const active = ltrNum === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLiters(String(n))}
                      className={`press flex min-h-11 items-center justify-center rounded-2xl border text-sm font-bold ${
                        active
                          ? 'border-lime bg-lime text-on-lime'
                          : 'border-input bg-card text-muted-foreground'
                      }`}
                    >
                      {n} L
                    </button>
                  )
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Liter">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="cth. 3"
                />
              </Field>
              <Field label="Kapasitas tangki (L)">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={tank}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, '')
                    setTank(v)
                    try {
                      localStorage.setItem('mm-tank', v || '5')
                    } catch {
                      /* penyimpanan penuh — abaikan */
                    }
                  }}
                  placeholder="5"
                />
              </Field>
            </div>
          </>
        )}

        <Field label="Nominal (Rp)">
          <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="cth. 20000" />
        </Field>
        {amtNum > 0 && (
          <p className="px-1 text-[13px] font-bold text-foreground">
            <CircleDollarSign size={14} className="mr-1 inline" />
            {formatRupiah(amtNum)}
            {perLiter != null && (
              <span className="ml-2 font-semibold text-muted-foreground">
                ≈ Rp{formatRupiah(perLiter)}/liter
              </span>
            )}
          </p>
        )}
        <Field label="Tanggal">
          <input type="date" className={inputCls} value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Catatan" hint="Opsional">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={category === 'bensin' ? 'cth. Pertalite di Pertamina' : 'cth. Ganti kampas rem'} />
        </Field>
        <Btn variant="lime" full onClick={submit} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan Pengeluaran'}
        </Btn>
      </div>
    </Sheet>
  )
}

// Ekspor tipe ExpenseDTO agar view lain bisa pakai (type-only)
export type { ExpenseDTO }
