import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sessionUserId } from '@/lib/guard'

type Params = { params: Promise<{ id: string }> }

const CATEGORIES = ['bensin', 'parkir', 'servis', 'lainnya']

/** Muat pengeluaran milik akun yang login (via kendaraan). */
async function loadOwnedExpense(id: string) {
  const userId = await sessionUserId()
  if (!userId) return { error: 'Belum login', status: 401 as const }
  const expense = await db.expense.findFirst({
    where: { id, vehicle: { userId } },
  })
  if (!expense) return { error: 'Pengeluaran tidak ditemukan', status: 404 as const }
  return { expense }
}

// Edit pengeluaran — kategori, jumlah, liter, catatan, tanggal
export async function PATCH(req: NextRequest, { params }: Params) {
  const rl = rateLimit(req, 'write', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const { id } = await params
    const body = await req.json()

    const loaded = await loadOwnedExpense(id)
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }

    const data: Record<string, unknown> = {}

    if (body.category !== undefined) {
      if (!CATEGORIES.includes(String(body.category))) {
        return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
      }
      data.category = String(body.category)
    }
    if (body.amount !== undefined) {
      data.amount = Math.max(0, Math.round(Number(body.amount) || 0))
    }
    if (body.liters !== undefined) {
      data.liters =
        body.liters === null || body.liters === ''
          ? null
          : Math.max(0, Number(body.liters) || 0)
    }
    if (body.note !== undefined) {
      data.note = body.note ? String(body.note).trim().slice(0, 160) || null : null
    }
    if (body.date !== undefined) {
      const d = new Date(`${String(body.date)}T09:00:00`)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
      }
      data.date = d
    }

    if (Object.keys(data).length > 0) {
      await db.expense.update({ where: { id }, data })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/expenses/[id] error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui pengeluaran' }, { status: 500 })
  }
}

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
    const loaded = await loadOwnedExpense(id)
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error)
    return NextResponse.json({ error: 'Gagal menghapus pengeluaran' }, { status: 500 })
  }
}
