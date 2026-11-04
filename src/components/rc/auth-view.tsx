'use client'

/**
 * AuthView — layar masuk & daftar akun MotoMate.
 * • Badge sparkle dihapus — diganti bar brand ringkas (logo + MotoMate).
 * • Perkenalan tetap "terlampir" di halaman login: strip carousel mini
 *   dengan tombol panah di bawah form, plus tombol untuk memutar
 *   perkenalan penuh lagi.
 * Pengguna baru disambut slide perkenalan + preferensi sebelum form login.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BellRing,
  Bike,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IntroView } from '@/components/rc/intro-view'

export interface AuthUser {
  id: string
  name: string
  email: string
}

type Mode = 'login' | 'register'

const INTRO_KEY = 'mm-intro'

const inputCls =
  'min-h-12 w-full rounded-2xl border border-input bg-card px-4 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50'

/** konten strip perkenalan mini di halaman login (selaras onboarding penuh) */
const MINI_SLIDES = [
  {
    icon: Bike,
    title: 'Your Motorcycle, One Place',
    desc: 'Kelola informasi kendaraan dan pantau kondisi motor dalam satu aplikasi.',
  },
  {
    icon: BellRing,
    title: 'Never Miss Your Maintenance',
    desc: 'Jadwal servis, oli, dan komponen terpantau lewat pengingat praktis.',
  },
  {
    icon: CircleDollarSign,
    title: 'Everything Under Control',
    desc: 'Riwayat perawatan dan pengeluaran motor tercatat rapi dan teratur.',
  },
] as const

/** item form muncul berurutan halus */
function Stagger({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** strip carousel mini dengan tombol — perkenalan terlampir di login */
function MiniIntroCarousel() {
  const [idx, setIdx] = useState(0)
  const go = (d: number) =>
    setIdx((i) => Math.max(0, Math.min(MINI_SLIDES.length - 1, i + d)))

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-muted/70">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -26 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="flex items-center gap-3 p-3.5"
          >
            {(() => {
              const s = MINI_SLIDES[idx]
              const Icon = s.icon
              return (
                <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime">
                    <Icon size={19} className="text-on-lime" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                </>
              )
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={idx === 0}
          aria-label="Perkenalan sebelumnya"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-opacity disabled:opacity-25"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {MINI_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => setIdx(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === idx ? 'w-5 bg-foreground' : 'w-1.5 bg-border'
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={idx === MINI_SLIDES.length - 1}
          aria-label="Perkenalan berikutnya"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-opacity disabled:opacity-25"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

export function AuthView({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  // null = belum tahu (hindari mismatch SSR), true = tampilkan perkenalan
  const [intro, setIntro] = useState<boolean | null>(null)
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setIntro(localStorage.getItem(INTRO_KEY) !== '1')
  }, [])

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
        throw new Error(data.error || 'Terjadi kesalahan, coba lagi')
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

  // Perkenalan aplikasi + preferensi untuk pengunjung baru
  if (intro !== false) {
    if (intro === null) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-lime border-t-transparent" />
        </div>
      )
    }
    return <IntroView onDone={() => setIntro(false)} />
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background px-4 pb-8 pt-7 sm:items-center sm:pb-4 sm:pt-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-[400px] flex-col"
      >
        <div className="rounded-[32px] border border-border/60 bg-card p-6 shadow-[0_10px_40px_rgba(16,17,16,0.06)] sm:p-7">
          {/* Bar brand ringkas — tanpa badge sparkle */}
          <Stagger>
            <span className="flex items-center gap-2">
              <motion.span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime"
                initial={{ rotate: -8, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <Bike size={17} className="text-on-lime" />
              </motion.span>
              <span className="text-[14px] font-extrabold tracking-tight text-foreground">
                MotoMate
              </span>
            </span>
          </Stagger>

          <Stagger delay={0.05}>
            <h1 className="mt-4 text-[25px] font-extrabold leading-tight tracking-tight text-foreground">
              {isLogin ? (
                <>
                  Selamat Datang,
                  <br />
                  Sobat Rider!
                </>
              ) : (
                'Buat Akun Baru'
              )}
            </h1>
          </Stagger>
          <Stagger delay={0.09}>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {isLogin
                ? 'Senang melihatmu lagi. Masuk untuk melanjutkan memantau kondisi motormu.'
                : 'Prosesnya kurang dari satu menit. Isi nama, email, dan password untuk mulai pakai MotoMate.'}
            </p>
          </Stagger>

          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            <Stagger delay={0.13}>
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
            </Stagger>

            <Stagger delay={0.17}>
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
            </Stagger>

            <Stagger delay={0.21}>
              <button
                type="submit"
                disabled={busy}
                className="press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-lime text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105 disabled:opacity-60"
              >
                {busy && <Loader2 size={17} className="animate-spin" />}
                {busy ? 'Memproses…' : isLogin ? 'Masuk' : 'Buat Akun'}
              </button>
            </Stagger>
          </form>

          <Stagger delay={0.25}>
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold text-muted-foreground">atau</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </Stagger>

          <Stagger delay={0.29}>
            <button
              type="button"
              onClick={switchMode}
              disabled={busy}
              className="press inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink text-[15px] font-extrabold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isLogin ? 'Buat Akun Baru' : 'Masuk ke Akun'}
            </button>
          </Stagger>

          {/* Perkenalan terlampir — strip mini dengan navigasi tombol */}
          <Stagger delay={0.33}>
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Kenali MotoMate, ketuk panah untuk lihat
              </p>
              <MiniIntroCarousel />
            </div>
          </Stagger>
        </div>

        <Stagger delay={0.37}>
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

          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(INTRO_KEY)
              } catch {
                /* abaikan */
              }
              setIntro(true)
            }}
            className="mx-auto mt-2 block rounded-full px-3 py-1.5 text-[11px] font-bold text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            Lihat perkenalan aplikasi
          </button>
        </Stagger>
      </motion.div>
    </div>
  )
}
