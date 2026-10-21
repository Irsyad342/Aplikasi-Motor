import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getCatalog } from '@/lib/catalog'

const DAY = 86_400_000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)

// Kunci advisory lock unik untuk aplikasi ini (mencegah race condition double-seed)
const SEED_LOCK_KEY = 745861

// Konfigurasi seed agar distribusi status sama seperti aplikasi RideCheck:
// 2 "Perlu diganti" (merah), 1 "Periksa Segera" (kuning), 9 "Sehat" (hijau)
const SEED_VEHICLE = {
  name: 'Si Ganteng Ireng',
  type: 'motor',
  odometer: 7170,
  imageKey: 'motor-green',
}

interface SeedComponent {
  key: string
  lastServiceOdo: number
  daysAgo: number
  type: 'ganti' | 'servis'
  extraRecords?: Array<{ odo: number; daysAgo: number; type: 'ganti' | 'servis' }>
}

const SEED_COMPONENTS: SeedComponent[] = [
  { key: 'busi', lastServiceOdo: 100, daysAgo: 172, type: 'ganti' },
  { key: 'filter-oli', lastServiceOdo: 4063, daysAgo: 112, type: 'ganti' },
  { key: 'filter-udara', lastServiceOdo: 6170, daysAgo: 140, type: 'ganti' },
  { key: 'cakram-rem', lastServiceOdo: 0, daysAgo: 365, type: 'servis' },
  { key: 'minyak-rem', lastServiceOdo: 0, daysAgo: 400, type: 'ganti' },
  { key: 'filter-bahan-bakar', lastServiceOdo: 0, daysAgo: 450, type: 'ganti' },
  { key: 'kampas-rem', lastServiceOdo: 0, daysAgo: 300, type: 'servis' },
  {
    key: 'v-belt-cvt',
    lastServiceOdo: 278,
    daysAgo: 320,
    type: 'ganti',
  },
  { key: 'roller-cvt', lastServiceOdo: 278, daysAgo: 320, type: 'ganti' },
  { key: 'air-radiator', lastServiceOdo: 0, daysAgo: 240, type: 'servis' },
  {
    key: 'oli-mesin',
    lastServiceOdo: 6670,
    daysAgo: 15,
    type: 'ganti',
    extraRecords: [
      { odo: 4670, daysAgo: 80, type: 'ganti' },
      { odo: 3170, daysAgo: 145, type: 'ganti' },
    ],
  },
  { key: 'oli-gardan', lastServiceOdo: 7170, daysAgo: 20, type: 'ganti' },
]

// Komponen yang TIDAK terpasang (muncul di tab Perawatan sebagai "Ketuk untuk Menambah")
const SEED_UNINSTALLED = ['aki-12v', 'tensioner-v-belt', 'rantai-gir']

export async function seedDemoData(client: Prisma.TransactionClient = db) {
  const vehicle = await client.vehicle.create({
    data: {
      name: SEED_VEHICLE.name,
      type: SEED_VEHICLE.type,
      odometer: SEED_VEHICLE.odometer,
      imageKey: SEED_VEHICLE.imageKey,
    },
  })

  const catalog = getCatalog(vehicle.type)

  for (const item of catalog) {
    const seed = SEED_COMPONENTS.find((s) => s.key === item.key)
    const installed = !SEED_UNINSTALLED.includes(item.key)

    if (installed && seed) {
      const lastServiceDate = daysAgo(seed.daysAgo)
      const component = await client.component.create({
        data: {
          vehicleId: vehicle.id,
          key: item.key,
          name: item.name,
          icon: item.icon,
          intervalKm: item.intervalKm,
          intervalDays: item.intervalDays,
          recommendedKm: item.intervalKm,
          recommendedDays: item.intervalDays,
          lastServiceOdo: seed.lastServiceOdo,
          lastServiceDate,
          hasService: true,
          installed: true,
        },
      })

      const records = [
        {
          componentId: component.id,
          vehicleId: vehicle.id,
          type: seed.type,
          odometer: seed.lastServiceOdo,
          date: lastServiceDate,
          note: null as string | null,
        },
        ...(seed.extraRecords ?? []).map((r) => ({
          componentId: component.id,
          vehicleId: vehicle.id,
          type: r.type,
          odometer: r.odo,
          date: daysAgo(r.daysAgo),
          note: null as string | null,
        })),
      ]
      await client.serviceRecord.createMany({ data: records })
    } else {
      await client.component.create({
        data: {
          vehicleId: vehicle.id,
          key: item.key,
          name: item.name,
          icon: item.icon,
          intervalKm: item.intervalKm,
          intervalDays: item.intervalDays,
          recommendedKm: item.intervalKm,
          recommendedDays: item.intervalDays,
          lastServiceOdo: vehicle.odometer,
          lastServiceDate: new Date(),
          hasService: false,
          installed: false,
        },
      })
    }
  }

  return vehicle
}

export async function ensureSeed() {
  const count = await db.vehicle.count()
  if (count > 0) return

  // Gunakan transaksi + advisory lock agar seed hanya dijalankan sekali
  // meskipun beberapa request masuk bersamaan (race condition di serverless)
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`
    const c = await tx.vehicle.count()
    if (c === 0) {
      await seedDemoData(tx)
    }
  })
}

export async function resetDemoData() {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`
    await tx.vehicle.deleteMany()
    await tx.serviceRecord.deleteMany()
    await tx.component.deleteMany()
    await tx.trip.deleteMany()
    await seedDemoData(tx)
  })
}
