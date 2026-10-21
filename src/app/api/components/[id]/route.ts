import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

const DAY = 86_400_000

export async function PATCH(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'components')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const body = await req.json()

    const component = await db.component.findUnique({
      where: { id },
      include: { vehicle: true },
    })
    if (!component) {
      return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    // Pasang komponen yang belum terpasang
    if (body.action === 'install') {
      data.installed = true
      data.lastServiceOdo = component.vehicle.odometer
      data.lastServiceDate = new Date()
      data.hasService = false
      await db.component.update({ where: { id }, data })
      return NextResponse.json({ ok: true })
    }

    if (body.intervalKm !== undefined) {
      data.intervalKm = Math.max(0, Math.round(Number(body.intervalKm) || 0))
    }
    if (body.intervalDays !== undefined) {
      data.intervalDays = Math.max(1, Math.round(Number(body.intervalDays) || 1))
    }

    // Sesuaikan sisa penggunaan (km): geser baseline odometer servis terakhir
    if (body.setRemainingKm !== undefined) {
      const interval = data.intervalKm !== undefined ? (data.intervalKm as number) : component.intervalKm
      const remaining = Math.max(0, Math.min(interval, Math.round(Number(body.setRemainingKm) || 0)))
      data.lastServiceOdo = Math.max(0, component.vehicle.odometer - (interval - remaining))
    }

    // Sesuaikan sisa waktu (hari): geser tanggal servis terakhir
    if (body.setRemainingDays !== undefined) {
      const interval = data.intervalDays !== undefined ? (data.intervalDays as number) : component.intervalDays
      const remaining = Math.max(0, Math.min(interval, Math.round(Number(body.setRemainingDays) || 0)))
      data.lastServiceDate = new Date(Date.now() - (interval - remaining) * DAY)
    }

    if (Object.keys(data).length > 0) {
      await db.component.update({ where: { id }, data })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/components/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui komponen' }, { status: 500 })
  }
}

// Lepas komponen (masuk katalog "Ketuk untuk Menambah")
export async function DELETE(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'components')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const component = await db.component.findUnique({
      where: { id },
      include: { vehicle: true },
    })
    if (!component) {
      return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 })
    }
    await db.component.update({
      where: { id },
      data: {
        installed: false,
        hasService: false,
        lastServiceOdo: component.vehicle.odometer,
        lastServiceDate: new Date(),
      },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/components/[id] error:', error)
    return NextResponse.json({ error: 'Gagal melepas komponen' }, { status: 500 })
  }
}
