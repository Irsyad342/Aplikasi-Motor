import { NextRequest, NextResponse } from 'next/server'
import { buildState } from '@/lib/state'
import { ensureSeed } from '@/lib/seed'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'read', 'state')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  try {
    await ensureSeed()
    const vehicleId = req.nextUrl.searchParams.get('vehicleId')
    const state = await buildState(vehicleId)
    return NextResponse.json(state)
  } catch (error) {
    console.error('GET /api/state error:', error)
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 })
  }
}
