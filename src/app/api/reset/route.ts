import { NextResponse } from 'next/server'
import { resetDemoData } from '@/lib/seed'

export async function POST() {
  try {
    await resetDemoData()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/reset error:', error)
    return NextResponse.json({ error: 'Gagal mengatur ulang data' }, { status: 500 })
  }
}
