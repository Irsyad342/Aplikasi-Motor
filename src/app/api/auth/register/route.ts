import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword, isValidEmail } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; email?: string; password?: string }
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar — silakan masuk' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    })

    // Akun baru = mulai bersih. Sekalian buang sisa data demo lama
    // (kendaraan tanpa pemilik) agar tidak menumpuk di database.
    await db.vehicle.deleteMany({ where: { userId: null } })

    await createSession(user.id)
    return NextResponse.json({ user })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json({ error: 'Gagal membuat akun — coba lagi' }, { status: 500 })
  }
}
