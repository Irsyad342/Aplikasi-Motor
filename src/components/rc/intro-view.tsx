'use client'

/**
 * IntroView — perkenalan MotoMate di halaman login (3 slide).
 * Slide terakhir berisi preferensi awal: tema tampilan & pengingat otomatis.
 * Ditampilkan sekali untuk pengguna baru (tanda di localStorage 'mm-intro'),
 * dan bisa diputar ulang dari halaman login.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ArrowRight,
  Bike,
  CircleDollarSign,
  Route,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'system', label: 'Sistem' },
] as const

export function IntroView({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const { setTheme } = useTheme()
  const [reminder, setReminder] = useState(true)
  const last = slide === 2

  function finish() {
    try {
      localStorage.setItem('mm-intro', '1')
      localStorage.setItem('rc-reminder', reminder ? '1' : '0')
    } catch {
      /* penyimpanan penuh — abaikan */
    }
    onDone()
  }

  function next() {
    if (last) finish()
    else setSlide((s) => s + 1)
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background px-4 pb-8 pt-6 sm:items-center sm:pb-4 sm:pt-4">
      <div className="flex w-full max-w-[400px] flex-col">
        {/* Header: logo + lewati */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime">
              <Bike size={17} className="text-on-lime" />
            </span>
            <span className="text-[14px] font-extrabold tracking-tight text-foreground">
              MotoMate
            </span>
          </span>
          <button
            type="button"
            onClick={finish}
            className="press rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            Lewati
          </button>
        </div>

        {/* Isi slide */}
        <div className="relative mt-6 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {slide === 0 && (
              <motion.section
                key="s0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="min-h-[380px] rounded-[32px] border border-border/60 bg-card p-7 sm:min-h-[420px]"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-lime">
                  <Sparkles size={26} className="text-on-lime" strokeWidth={2.2} />
                </span>
                <h1 className="mt-6 text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
                  Teman Setia
                  <br />
                  Perawatan Motor
                </h1>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                  MotoMate membantu kamu merawat motor tanpa ribet — tahu kapan
                  komponen perlu diganti, mencatat perjalanan, dan mengontrol
                  pengeluaran. Semua dalam satu aplikasi ringan.
                </p>
                <div className="mt-6 flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                  <ShieldCheck size={16} className="shrink-0 text-foreground" />
                  <p className="text-[12px] font-semibold leading-snug text-muted-foreground">
                    Datamu tersimpan aman di akunmu sendiri — tidak ada data
                    contoh, semua mulai bersih.
                  </p>
                </div>
              </motion.section>
            )}

            {slide === 1 && (
              <motion.section
                key="s1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="min-h-[380px] rounded-[32px] border border-border/60 bg-card p-7 sm:min-h-[420px]"
              >
                <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
                  Apa saja isinya?
                </h1>
                <div className="mt-5 space-y-4">
                  {(
                    [
                      {
                        icon: Wrench,
                        title: 'Pemantau komponen',
                        desc: 'Oli, busi, rem, hingga filter — sisa pakai dihitung otomatis dari odometer & waktu.',
                      },
                      {
                        icon: Route,
                        title: 'Rekam perjalanan GPS',
                        desc: 'Rute, jarak, dan durasi terekam otomatis saat kamu berkendara.',
                      },
                      {
                        icon: CircleDollarSign,
                        title: 'Biaya & analitik',
                        desc: 'Bensin, parkir, servis — lihat grafik pengeluaran bulanan biar hemat.',
                      },
                    ] as const
                  ).map((f) => {
                    const Icon = f.icon
                    return (
                      <div key={f.title} className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/15 text-foreground">
                          <Icon size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-extrabold text-foreground">{f.title}</p>
                          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                            {f.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.section>
            )}

            {slide === 2 && (
              <motion.section
                key="s2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="min-h-[380px] rounded-[32px] border border-border/60 bg-card p-7 sm:min-h-[420px]"
              >
                <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
                  Sesuaikan seleramu
                </h1>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  Preferensi ini bisa diubah kapan saja di Pengaturan.
                </p>

                {/* Tema */}
                <div className="mt-5">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tema tampilan
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTheme(t.value)}
                        className={cn(
                          'press min-h-11 rounded-2xl border text-[13px] font-bold transition-colors',
                          'border-input bg-card text-muted-foreground'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pengingat */}
                <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-foreground">Pengingat Otomatis</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Notifikasi saat komponen mendekati batas pakai
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reminder}
                    aria-label="Pengingat Otomatis"
                    onClick={() => setReminder((v) => !v)}
                    className={cn(
                      'press relative h-7 w-12 shrink-0 rounded-full transition-colors',
                      reminder ? 'bg-lime' : 'bg-border'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-ink shadow-sm transition-transform',
                        reminder && 'translate-x-5'
                      )}
                    />
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Navigasi */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === slide ? 'w-5 bg-foreground' : 'w-1.5 bg-border'
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-lime px-6 text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105"
          >
            {last ? 'Mulai Sekarang' : 'Lanjut'}
            <ArrowRight size={17} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}
