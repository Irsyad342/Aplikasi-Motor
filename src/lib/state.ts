import { db } from '@/lib/db'
import { computeHealth, type ComponentStatus } from '@/lib/status'
import { getCatalog } from '@/lib/catalog'

export interface HealthDTO {
  status: ComponentStatus
  kmRemaining: number
  kmPct: number
  daysRemaining: number
  timePct: number
  estDate: string
  worstPct: number
}

export interface ComponentDTO {
  id: string
  vehicleId: string
  key: string
  name: string
  icon: string
  intervalKm: number
  intervalDays: number
  recommendedKm: number
  recommendedDays: number
  lastServiceOdo: number
  lastServiceDate: string
  hasService: boolean
  installed: boolean
  health: HealthDTO | null // null jika belum terpasang
  info?: string
}

export interface VehicleDTO {
  id: string
  name: string
  type: string
  plate: string | null
  odometer: number
  imageKey: string
}

export interface TripDTO {
  id: string
  distance: number
  duration: number
  /** Detik bergerak efektif menurut GPS — null pada trip lama/manual */
  movingSec: number | null
  startOdo: number
  endOdo: number
  source: string
  path: string | null
  startedAt: string
  endedAt: string
}

export interface RecordDTO {
  id: string
  componentId: string
  componentName: string
  componentIcon: string
  type: string
  odometer: number
  date: string
  note: string | null
  cost: number | null
  workshop: string | null
}

export interface ExpenseDTO {
  id: string
  category: string // bensin | parkir | servis | lainnya
  amount: number
  liters: number | null // jumlah bensin (liter), khusus kategori bensin
  note: string | null
  date: string
}

/** Catatan perawatan khusus dari halaman "Perawatan CVT & Throttle Body" */
export interface CvtLogDTO {
  id: string
  vehicleId: string
  kind: string // 'cvt' | 'tb'
  item: string // key item, mis. 'bersih-rumah-cvt'
  odometer: number
  date: string
  cost: number | null
  workshop: string | null
  note: string | null
}

export interface AppState {
  vehicles: VehicleDTO[]
  vehicle: VehicleDTO | null
  components: ComponentDTO[]
  trips: TripDTO[]
  records: RecordDTO[]
  expenses: ExpenseDTO[]
  cvtLogs: CvtLogDTO[]
  catalogKeys: string[]
}

/**
 * Susun seluruh state aplikasi untuk SATU akun.
 * Setiap akun hanya melihat kendaraan miliknya sendiri — akun baru
 * otomatis mulai tanpa data (tanpa data demo).
 */
export async function buildState(
  userId: string,
  vehicleId?: string | null
): Promise<AppState> {
  const vehicles = await db.vehicle.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, type: true, plate: true, odometer: true, imageKey: true,
    },
  })

  const vehicle =
    (vehicleId && vehicles.find((v) => v.id === vehicleId)) ||
    vehicles[0] ||
    null

  if (!vehicle) {
    return { vehicles, vehicle: null, components: [], trips: [], records: [], expenses: [], cvtLogs: [], catalogKeys: [] }
  }

  const now = new Date()

  const [componentRows, trips, records, expenses, cvtLogs, catalogItems] = await Promise.all([
    db.component.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: [{ installed: 'desc' }, { name: 'asc' }],
    }),
    db.trip.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    db.serviceRecord.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { date: 'desc' },
      take: 100,
      include: { component: { select: { name: true, icon: true } } },
    }),
    db.expense.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    db.cvtLog.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    Promise.resolve(getCatalog(vehicle.type)),
  ])

  // Backfill: kendaraan lama dibuat sebelum katalog bertambah — pastikan
  // setiap item katalog punya baris komponen. Item yang kurang masuk sebagai
  // belum terpasang (muncul di katalog Perawatan).
  let components = componentRows
  const missing = catalogItems.filter((i) => !components.some((c) => c.key === i.key))

  // Bersihkan komponen yang sudah tidak ada di katalog (mis. 'servis-cvt'
  // digantikan halaman panduan Perawatan CVT & Throttle Body). Riwayat servis
  // terkait ikut terhapus otomatis (cascade).
  const extraKeys = components
    .map((c) => c.key)
    .filter((k) => !catalogItems.some((i) => i.key === k))

  if (missing.length > 0 || extraKeys.length > 0) {
    if (missing.length > 0) {
      await db.component.createMany({
        data: missing.map((i) => ({
          vehicleId: vehicle.id,
          key: i.key,
          name: i.name,
          icon: i.icon,
          intervalKm: i.intervalKm,
          intervalDays: i.intervalDays,
          recommendedKm: i.intervalKm,
          recommendedDays: i.intervalDays,
          lastServiceOdo: vehicle.odometer,
          lastServiceDate: now,
          hasService: false,
          installed: false,
        })),
        skipDuplicates: true,
      })
    }
    if (extraKeys.length > 0) {
      await db.component.deleteMany({
        where: { vehicleId: vehicle.id, key: { in: extraKeys } },
      })
    }
    components = await db.component.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: [{ installed: 'desc' }, { name: 'asc' }],
    })
  }

  const componentDTOs: ComponentDTO[] = components.map((c) => ({
    id: c.id,
    vehicleId: c.vehicleId,
    key: c.key,
    name: c.name,
    icon: c.icon,
    intervalKm: c.intervalKm,
    intervalDays: c.intervalDays,
    recommendedKm: c.recommendedKm,
    recommendedDays: c.recommendedDays,
    lastServiceOdo: c.lastServiceOdo,
    lastServiceDate: c.lastServiceDate.toISOString(),
    hasService: c.hasService,
    installed: c.installed,
    health: c.installed
      ? (() => {
          const h = computeHealth(c, vehicle.odometer, now)
          return {
            status: h.status,
            kmRemaining: h.kmRemaining,
            kmPct: h.kmPct,
            daysRemaining: h.daysRemaining,
            timePct: h.timePct,
            estDate: h.estDate.toISOString(),
            worstPct: h.worstPct,
          }
        })()
      : null,
    info: catalogItems.find((i) => i.key === c.key)?.info,
  }))

  return {
    vehicles,
    vehicle,
    components: componentDTOs,
    trips: trips.map((t) => ({
      id: t.id,
      distance: t.distance,
      duration: t.duration,
      movingSec: t.movingSec ?? null,
      startOdo: t.startOdo,
      endOdo: t.endOdo,
      source: t.source,
      path: t.path,
      startedAt: t.startedAt.toISOString(),
      endedAt: t.endedAt.toISOString(),
    })),
    records: records.map((r) => ({
      id: r.id,
      componentId: r.componentId,
      componentName: r.component.name,
      componentIcon: r.component.icon,
      type: r.type,
      odometer: r.odometer,
      date: r.date.toISOString(),
      note: r.note,
      cost: r.cost,
      workshop: r.workshop,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: e.amount,
      liters: e.liters ?? null,
      note: e.note,
      date: e.date.toISOString(),
    })),
    cvtLogs: cvtLogs.map((l) => ({
      id: l.id,
      vehicleId: l.vehicleId,
      kind: l.kind,
      item: l.item,
      odometer: l.odometer,
      date: l.date.toISOString(),
      cost: l.cost,
      workshop: l.workshop,
      note: l.note,
    })),
    catalogKeys: catalogItems.map((i) => i.key),
  }
}
