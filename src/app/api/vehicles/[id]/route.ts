import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

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

    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 })
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
    const count = await db.vehicle.count()
    if (count <= 1) {
      return NextResponse.json({ error: 'Minimal satu kendaraan harus ada' }, { status: 400 })
    }
    await db.vehicle.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus kendaraan' }, { status: 500 })
  }
}
