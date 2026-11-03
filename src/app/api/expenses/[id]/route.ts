import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

// Hapus pengeluaran
export async function DELETE(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 })
    }
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus pengeluaran' }, { status: 500 })
  }
}
