import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await db.trip.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/trips/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus perjalanan' }, { status: 500 })
  }
}
