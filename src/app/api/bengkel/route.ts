import { NextRequest, NextResponse } from 'next/server'
import { BENGKEL_LIST } from '@/lib/bengkel'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'read', 'bengkel')
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  return NextResponse.json(BENGKEL_LIST)
}
