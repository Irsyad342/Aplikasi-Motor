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
}

export interface AppState {
  vehicles: VehicleDTO[]
  vehicle: VehicleDTO | null
  components: ComponentDTO[]
  trips: TripDTO[]
  records: RecordDTO[]
  catalogKeys: string[]
}

export async function buildState(vehicleId?: string | null): Promise<AppState> {
  const vehicles = await db.vehicle.findMany({
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
    return { vehicles, vehicle: null, components: [], trips: [], records: [], catalogKeys: [] }
  }

  const now = new Date()

  const [components, trips, records, catalogItems] = await Promise.all([
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
    Promise.resolve(getCatalog(vehicle.type)),
  ])

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
    })),
    catalogKeys: catalogItems.map((i) => i.key),
  }
}
