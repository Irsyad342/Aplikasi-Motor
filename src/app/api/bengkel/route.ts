import { NextResponse } from 'next/server'
import { BENGKEL_LIST } from '@/lib/bengkel'

export async function GET() {
  return NextResponse.json(BENGKEL_LIST)
}
