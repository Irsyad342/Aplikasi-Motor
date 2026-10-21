import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (body.odometer !== undefined) data.odometer = Math.max(0, Math.round(Number(body.odometer) || 0))
    if (typeof body.plate === 'string') data.plate = body.plate.trim() || null

    const vehicle = await db.vehicle.update({ where: { id }, data })
    return NextResponse.json(vehicle)
  } catch (error) {
    console.error('PATCH /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui kendaraan' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
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
