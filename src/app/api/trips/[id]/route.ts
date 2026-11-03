import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sessionUserId } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

/** Muat trip milik akun yang login (via kendaraan). */
async function loadOwnedTrip(id: string) {
  const userId = await sessionUserId()
  if (!userId) return { error: 'Belum login', status: 401 as const }
  const trip = await db.trip.findFirst({
    where: { id, vehicle: { userId } },
    include: { vehicle: true },
  })
  if (!trip) return { error: 'Perjalanan tidak ditemukan', status: 404 as const }
  return { trip }
}

// Edit perjalanan — jarak & tanggal.
// Odometer kendaraan ikut disesuaikan (selisih jarak lama -> baru) agar
// sisa pakai komponen yang dihitung dari odometer tetap konsisten.
export async function PATCH(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const body = await req.json()

    const loaded = await loadOwnedTrip(id)
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    const trip = loaded.trip
    const vehicle = loaded.trip.vehicle

    const data: Record<string, unknown> = {}

    let newDistance = trip.distance
    if (body.distance !== undefined) {
      newDistance = Math.max(0, Number(body.distance) || 0)
      data.distance = newDistance
      data.endOdo = Math.round(trip.startOdo + newDistance)
    }

    if (body.date !== undefined) {
      const d = new Date(`${String(body.date)}T09:00:00`)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
      }
      data.startedAt = d
      data.endedAt = new Date(d.getTime() + trip.duration * 1000)
    }

    const newOdometer = Math.max(
      0,
      Math.round(vehicle.odometer - trip.distance + newDistance)
    )

    await db.$transaction([
      db.trip.update({ where: { id }, data }),
      db.vehicle.update({ where: { id: trip.vehicleId }, data: { odometer: newOdometer } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/trips/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui perjalanan' }, { status: 500 })
  }
}

// Hapus perjalanan — odometer dikembalikan sebesar jarak trip yang dihapus
// sehingga sisa pakai komponen otomatis "pulih".
export async function DELETE(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const loaded = await loadOwnedTrip(id)
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    const trip = loaded.trip
    const vehicle = loaded.trip.vehicle

    const newOdometer = Math.max(0, Math.round(vehicle.odometer - trip.distance))

    await db.$transaction([
      db.trip.delete({ where: { id } }),
      db.vehicle.update({ where: { id: trip.vehicleId }, data: { odometer: newOdometer } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/trips/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus perjalanan' }, { status: 500 })
  }
}
