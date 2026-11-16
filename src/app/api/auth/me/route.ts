import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidEmail, getSessionUser, verifyPassword, hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  return NextResponse.json({ user })
}

// Ubah profil: nama, email (opsional ganti password — perlu password saat ini)
export async function PATCH(req: NextRequest) {
  const rl = rateLimit(req, 'write', 'auth')
  if (!rl.ok) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 })
  }
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 })
    }
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : undefined
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : undefined

    if (name !== undefined && name.length < 2) {
      return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 })
    }
    if (name !== undefined && name.length > 60) {
      return NextResponse.json({ error: 'Nama terlalu panjang' }, { status: 400 })
    }
    if (email !== undefined && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 })
    }
    if (newPassword !== undefined && newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter' },
        { status: 400 }
      )
    }

    // Ganti password wajib konfirmasi password saat ini
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Masukkan password saat ini untuk konfirmasi' },
          { status: 400 }
        )
      }
      const user = await db.user.findUnique({ where: { id: session.id } })
      if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 })
      }
    }

    // Email unik milik orang lain → tolak
    if (email !== undefined && email !== session.email) {
      const taken = await db.user.findUnique({ where: { email } })
      if (taken) {
        return NextResponse.json({ error: 'Email sudah dipakai akun lain' }, { status: 400 })
      }
    }

    const data: { name?: string; email?: string; passwordHash?: string } = {}
    if (name !== undefined && name.length >= 2) data.name = name
    if (email !== undefined && isValidEmail(email)) data.email = email
    if (newPassword !== undefined) data.passwordHash = await hashPassword(newPassword)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    }

    await db.user.update({ where: { id: session.id }, data })
    return NextResponse.json({
      user: {
        id: session.id,
        name: data.name ?? session.name,
        email: data.email ?? session.email,
      },
    })
  } catch (error) {
    console.error('PATCH /api/auth/me error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 })
  }
}
