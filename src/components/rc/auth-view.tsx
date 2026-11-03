'use client'

/**
 * AuthView — layar masuk & daftar akun MotoMate.
 * Desain mengikuti referensi: badge ikon lime, judul besar, tombol CTA lime,
 * tombol sekunder gelap, input bersih dengan sudut membulat.
 */

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AuthUser {
  id: string
  name: string
  email: string
}

type Mode = 'login' | 'register'

const inputCls =
  'min-h-12 w-full rounded-2xl border border-input bg-card px-4 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50'

export function AuthView({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)

  const isLogin = mode === 'login'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!isLogin && name.trim().length < 2) return
    if (!email.trim() || !password) return
    setBusy(true)
    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isLogin ? { email: email.trim(), password } : { name: name.trim(), email: email.trim(), password }
        ),
      })
      const data = (await res.json().catch(() => ({}))) as { user?: AuthUser; error?: string }
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Terjadi kesalahan — coba lagi')
      }
      onAuthed(data.user)
    } catch (err) {
      import('sonner').then(({ toast }) => toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan'))
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(isLogin ? 'register' : 'login')
    setPassword('')
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background px-4 pb-10 pt-10 sm:items-center sm:pb-4 sm:pt-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="rounded-[32px] border border-border/60 bg-card p-6 shadow-[0_10px_40px_rgba(16,17,16,0.06)] sm:p-7">
          {/* Badge ikon lime */}
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime">
            <Sparkles size={22} className="text-on-lime" strokeWidth={2.2} />
          </span>

          <h1 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
            {isLogin ? 'Selamat Datang,' : 'Buat Akun Baru'}
            {isLogin && <br />}
            {isLogin && 'Sobat Rider!'}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {isLogin
              ? 'Senang melihatmu lagi. Masuk untuk melanjutkan memantau kondisi motormu.'
              : 'Prosesnya kurang dari satu menit. Isi nama, email, dan password untuk mulai pakai MotoMate.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
            {!isLogin && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                autoComplete="name"
                maxLength={40}
                required
                minLength={2}
                className={inputCls}
                aria-label="Nama kamu"
              />
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
              className={inputCls}
              aria-label="Email"
            />

            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={6}
                className={cn(inputCls, 'pr-12')}
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                className="press absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="press mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-lime text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105 disabled:opacity-60"
            >
              {busy && <Loader2 size={17} className="animate-spin" />}
              {busy ? 'Memproses…' : isLogin ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-bold text-muted-foreground">atau</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={switchMode}
            disabled={busy}
            className="press inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink text-[15px] font-extrabold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isLogin ? 'Buat Akun Baru' : 'Masuk ke Akun'}
          </button>
        </div>

        <p className="mt-5 text-center text-[13px] font-semibold text-muted-foreground">
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            type="button"
            onClick={switchMode}
            className="font-extrabold text-foreground underline decoration-lime decoration-[3px] underline-offset-4"
          >
            {isLogin ? 'Daftar' : 'Masuk'}
          </button>
        </p>

        <p className="mt-1 text-center text-[11px] font-semibold text-muted-foreground/70">
          MotoMate · Pelacak perawatan motor
        </p>
      </motion.div>
    </div>
  )
}
