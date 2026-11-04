import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sessionUserId } from '@/lib/guard'

// Item perawatan yang boleh dicatat di halaman "Perawatan CVT & Throttle Body"
// beserta komponen katalog yang sisa pakainya ikut direset saat item ini dicatat.
const CVT_ITEMS = ['bersih-rumah-cvt', 'ganti-roller', 'ganti-v-belt', 'oli-gardan'] as const
const TB_ITEMS = ['bersih-throttle-body', 'ganti-filter-udara'] as const

const ITEM_COMPONENTS: Record<string, string[]> = {
  'ganti-v-belt': ['v-belt-cvt', 'tensioner-v-belt'],
  'ganti-roller': ['roller-cvt'],
  'oli-gardan': ['oli-gardan'],
  'bersih-throttle-body': ['throttle-body'],
  'ganti-filter-udara': ['filter-udara'],
}

// Catat perawatan CVT / Throttle Body dari halaman khusus.
// Bila item terkait komponen katalog yang terpasang, baseline komponen
// (lastServiceOdo) ikut diperbarui sehingga sisa pakai terhitung ulang.
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'write', 'cvt-logs')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const userId = await sessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 })
    }

    const body = await req.json()
    const vehicleId = typeof body.vehicleId === 'string' ? body.vehicleId : ''
    const kind = body.kind === 'tb' ? 'tb' : body.kind === 'cvt' ? 'cvt' : null
    const item = typeof body.item === 'string' ? body.item : ''

    if (!kind) {
      return NextResponse.json({ error: 'Jenis perawatan tidak valid' }, { status: 400 })
    }
    const validItems = kind === 'cvt' ? CVT_ITEMS : TB_ITEMS
    if (!(validItems as readonly string[]).includes(item)) {
      return NextResponse.json({ error: 'Pilih jenis pekerjaan dulu' }, { status: 400 })
    }

    const vehicle = await db.vehicle.findFirst({
      where: { id: vehicleId, userId },
      select: { id: true, odometer: true },
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 })
    }

    const odometer = Math.round(Number(body.odometer) || 0)
    if (odometer <= 0) {
      return NextResponse.json({ error: 'Kilometer wajib diisi' }, { status: 400 })
    }
    if (odometer > vehicle.odometer) {
      return NextResponse.json(
        { error: `KM tidak bisa melebihi odometer saat ini (${vehicle.odometer.toLocaleString('id-ID')} km)` },
        { status: 400 }
      )
    }

    const date = body.date ? new Date(body.date) : new Date()
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }

    const note = body.note ? String(body.note).trim().slice(0, 200) || null : null
    const workshop = body.workshop ? String(body.workshop).trim().slice(0, 80) || null : null
    const cost =
      body.cost !== undefined && body.cost !== null && body.cost !== ''
        ? Math.max(0, Math.round(Number(body.cost) || 0))
        : null

    const [log] = await db.$transaction([
      db.cvtLog.create({
        data: {
          vehicleId: vehicle.id,
          kind,
          item,
          odometer,
          date,
          cost,
          workshop,
          note,
        },
      }),
      // Sinkronkan komponen katalog terkait yang terpasang — sisa pakai mulai dihitung ulang
      db.component.updateMany({
        where: {
          vehicleId: vehicle.id,
          installed: true,
          key: { in: ITEM_COMPONENTS[item] ?? [] },
        },
        data: {
          lastServiceOdo: odometer,
          lastServiceDate: date,
          hasService: true,
        },
      }),
    ])

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('POST /api/cvt-logs error:', error)
    return NextResponse.json({ error: 'Gagal mencatat perawatan' }, { status: 500 })
  }
}
