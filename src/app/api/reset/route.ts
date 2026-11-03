import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionUserId } from '@/lib/guard'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Endpoint destruktif — batas ketat
  const rl = rateLimit(req, 'sensitive', 'reset')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const userId = await sessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 })
    }
    // Hapus SELURUH data milik akun ini (kendaraan, komponen, servis,
    // perjalanan, pengeluaran) — akun kembali kosong seperti baru dibuat.
    // Data akun lain tidak tersentuh.
    await db.vehicle.deleteMany({ where: { userId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/reset error:', error)
    return NextResponse.json({ error: 'Gagal mengatur ulang data' }, { status: 500 })
  }
}
