import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    await createSession(user.id)
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (e) {
    console.error('login error', e)
    return NextResponse.json({ error: 'Gagal masuk, coba lagi' }, { status: 500 })
  }
}
