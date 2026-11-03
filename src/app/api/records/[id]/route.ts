import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

/**
 * Baseline komponen (lastServiceOdo/lastServiceDate) ditentukan catatan servis
 * TERBARU milik komponen tsb. Jika catatan terbaru diedit/dihapus, baseline
 * digeser mengikuti catatan tersisa yang paling baru — sehingga sisa pakai
 * komponen selalu konsisten dengan riwayat.
 */
async function resyncBaseline(componentId: string) {
  const newest = await db.serviceRecord.findFirst({
    where: { componentId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
  if (newest) {
    await db.component.update({
      where: { id: componentId },
      data: {
        lastServiceOdo: newest.odometer,
        lastServiceDate: newest.date,
        hasService: true,
      },
    })
  } else {
    await db.component.update({
      where: { id: componentId },
      data: { hasService: false },
    })
  }
}

// Edit catatan servis — jenis, odometer, tanggal, biaya, bengkel, catatan
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

    const record = await db.serviceRecord.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.type !== undefined) {
      data.type = body.type === 'servis' ? 'servis' : 'ganti'
    }
    if (body.odometer !== undefined) {
      data.odometer = Math.max(0, Math.round(Number(body.odometer) || 0))
    }
    if (body.date !== undefined) {
      const d = new Date(`${String(body.date)}T09:00:00`)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
      }
      data.date = d
    }
    if (body.note !== undefined) {
      data.note = body.note ? String(body.note).trim().slice(0, 200) || null : null
    }
    if (body.cost !== undefined) {
      data.cost =
        body.cost === null || body.cost === ''
          ? null
          : Math.max(0, Math.round(Number(body.cost) || 0))
    }
    if (body.workshop !== undefined) {
      data.workshop = body.workshop ? String(body.workshop).trim().slice(0, 80) || null : null
    }

    const updated = await db.serviceRecord.update({ where: { id }, data })

    // Jika ini catatan terbaru komponennya, baseline ikut berubah
    const newest = await db.serviceRecord.findFirst({
      where: { componentId: record.componentId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })
    if (newest && newest.id === record.id) {
      await db.component.update({
        where: { id: record.componentId },
        data: {
          lastServiceOdo: updated.odometer,
          lastServiceDate: updated.date,
          hasService: true,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/records/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui catatan' }, { status: 500 })
  }
}

// Hapus catatan servis — baseline komponen di-rollback ke catatan sebelumnya
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
    const record = await db.serviceRecord.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 })
    }

    await db.serviceRecord.delete({ where: { id } })
    await resyncBaseline(record.componentId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/records/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus catatan' }, { status: 500 })
  }
}
