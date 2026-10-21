import { NextRequest, NextResponse } from 'next/server'
import { buildState } from '@/lib/state'
import { ensureSeed } from '@/lib/seed'

export async function GET(req: NextRequest) {
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
