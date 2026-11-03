import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { ownedVehicle, sessionUserId } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

async function requireOwned(id: string) {
  const userId = await sessionUserId()
  if (!userId) return { error: 'Belum login', status: 401 as const }
  const vehicle = await ownedVehicle(id, userId)
  if (!vehicle) return { error: 'Kendaraan tidak ditemukan', status: 404 as const }
  return { vehicle }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'vehicles')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const body = await req.json()

    const guard = await requireOwned(id)
    if ('error' in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 60)
    if (body.odometer !== undefined) {
      data.odometer = Math.max(0, Math.min(10_000_000, Math.round(Number(body.odometer) || 0)))
    }
    if (typeof body.plate === 'string') data.plate = body.plate.trim().slice(0, 20) || null

    const vehicle = await db.vehicle.update({ where: { id }, data })
    return NextResponse.json(vehicle)
  } catch (error) {
    console.error('PATCH /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui kendaraan' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'vehicles')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const guard = await requireOwned(id)
    if ('error' in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    // Hapus kendaraan terakhir diperbolehkan — aplikasi menampilkan
    // layar sambutan untuk menambah kendaraan lagi.
    await db.vehicle.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus kendaraan' }, { status: 500 })
  }
}
