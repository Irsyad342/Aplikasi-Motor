import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCatalog } from '@/lib/catalog'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'write', 'vehicles')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim().slice(0, 60)
    const type = body.type === 'mobil' ? 'mobil' : 'motor'
    const odometer = Math.max(0, Math.min(10_000_000, Math.round(Number(body.odometer) || 0)))
    const plate = body.plate ? String(body.plate).trim().slice(0, 20) : null

    if (!name) {
      return NextResponse.json({ error: 'Nama kendaraan wajib diisi' }, { status: 400 })
    }

    const imageKey = type === 'mobil' ? 'car-gray' : 'motor-green'

    const vehicle = await db.vehicle.create({
      data: { name, type, odometer, imageKey, plate },
    })

    // Pasang seluruh katalog komponen dengan baseline di odometer saat ini
    const catalog = getCatalog(type)
    for (const item of catalog) {
      await db.component.create({
        data: {
          vehicleId: vehicle.id,
          key: item.key,
          name: item.name,
          icon: item.icon,
          intervalKm: item.intervalKm,
          intervalDays: item.intervalDays,
          recommendedKm: item.intervalKm,
          recommendedDays: item.intervalDays,
          lastServiceOdo: odometer,
          lastServiceDate: new Date(),
          hasService: false,
          installed: true,
        },
      })
    }

    return NextResponse.json({ id: vehicle.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/vehicles error:', error)
    return NextResponse.json({ error: 'Gagal menambah kendaraan' }, { status: 500 })
  }
}
