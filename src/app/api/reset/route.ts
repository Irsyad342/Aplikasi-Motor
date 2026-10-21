import { NextResponse } from 'next/server'
import { resetDemoData } from '@/lib/seed'
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
    await resetDemoData()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/reset error:', error)
    return NextResponse.json({ error: 'Gagal mengatur ulang data' }, { status: 500 })
  }
}
