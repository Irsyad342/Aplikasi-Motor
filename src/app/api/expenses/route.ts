import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

const CATEGORIES = ['bensin', 'parkir', 'servis', 'lainnya']

// Daftar pengeluaran kendaraan
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'read', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const vehicleId = req.nextUrl.searchParams.get('vehicleId')
    const expenses = await db.expense.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      orderBy: { date: 'desc' },
      take: 100,
    })
    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('GET /api/expenses error:', error)
    return NextResponse.json({ error: 'Gagal memuat pengeluaran' }, { status: 500 })
  }
}

// Catat pengeluaran baru (bensin, parkir, dll.)
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'write', 'trips')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    const body = await req.json()
    const vehicleId = String(body.vehicleId || '')
    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId wajib diisi' }, { status: 400 })
    }
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 })
    }

    const category = CATEGORIES.includes(body.category) ? body.category : 'lainnya'
    const amount = Math.round(Number(body.amount) || 0)
    if (amount <= 0) {
      return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 })
    }
    const date = body.date ? new Date(body.date) : new Date()
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }

    const expense = await db.expense.create({
      data: {
        vehicleId,
        category,
        amount,
        date,
        note: body.note ? String(body.note).trim().slice(0, 200) || null : null,
      },
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('POST /api/expenses error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan pengeluaran' }, { status: 500 })
  }
}
