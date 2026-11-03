import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sessionUserId } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Catat penggantian/servis komponen -> reset baseline komponen
export async function POST(req: NextRequest, { params }: Params) {
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

    const userId = await sessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 })
    }
    const component = await db.component.findFirst({
      where: { id, vehicle: { userId } },
    })
    if (!component) {
      return NextResponse.json({ error: 'Komponen tidak ditemukan' }, { status: 404 })
    }

    const type = body.type === 'servis' ? 'servis' : 'ganti'
    const odometer = Math.max(0, Math.round(Number(body.odometer) || 0))
    const date = body.date ? new Date(body.date) : new Date()
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }

    const [record] = await db.$transaction([
      db.serviceRecord.create({
        data: {
          componentId: component.id,
          vehicleId: component.vehicleId,
          type,
          odometer,
          date,
          note: body.note ? String(body.note).trim().slice(0, 200) || null : null,
          cost:
            body.cost !== undefined && body.cost !== null && body.cost !== ''
              ? Math.max(0, Math.round(Number(body.cost) || 0))
              : null,
          workshop: body.workshop ? String(body.workshop).trim().slice(0, 80) || null : null,
        },
      }),
      db.component.update({
        where: { id: component.id },
        data: {
          lastServiceOdo: odometer,
          lastServiceDate: date,
          hasService: true,
          installed: true,
        },
      }),
    ])

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('POST /api/components/[id]/service error:', error)
    return NextResponse.json({ error: 'Gagal mencatat servis' }, { status: 500 })
  }
}
