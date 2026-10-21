import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

// Simpan perjalanan baru & tambahkan jaraknya ke odometer kendaraan
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'write', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const body = await req.json()
    const vehicleId = String(body.vehicleId ?? '')
    const distance = Math.max(0, Number(body.distance) || 0)
    const duration = Math.max(0, Math.round(Number(body.duration) || 0))
    const source = body.source === 'auto' ? 'auto' : 'manual'

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId wajib diisi' }, { status: 400 })
    }

    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 })
    }

    const startOdo = vehicle.odometer
    const endOdo = Math.round(startOdo + distance)

    const [trip] = await db.$transaction([
      db.trip.create({
        data: {
          vehicleId,
          distance,
          duration,
          startOdo,
          endOdo,
          source,
          path:
            typeof body.path === 'string' && body.path.length > 4
              ? body.path.slice(0, 500000)
              : null,
          startedAt: body.startedAt ? new Date(body.startedAt) : new Date(Date.now() - duration * 1000),
          endedAt: body.endedAt ? new Date(body.endedAt) : new Date(),
        },
      }),
      db.vehicle.update({
        where: { id: vehicleId },
        data: { odometer: endOdo },
      }),
    ])

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error('POST /api/trips error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan perjalanan' }, { status: 500 })
  }
}
