import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sessionUserId } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

// Hapus catatan perawatan CVT / Throttle Body milik akun sendiri
export async function DELETE(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'cvt-logs')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const userId = await sessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 })
    }

    const log = await db.cvtLog.findFirst({
      where: { id, vehicle: { userId } },
      select: { id: true },
    })
    if (!log) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 })
    }

    await db.cvtLog.delete({ where: { id: log.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/cvt-logs/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus catatan' }, { status: 500 })
  }
}
