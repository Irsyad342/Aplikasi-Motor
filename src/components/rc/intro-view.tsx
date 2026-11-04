'use client'

/**
 * IntroView — perkenalan MotoMate (bisa digeser / swipe).
 * • Tanpa badge sparkle — langsung ke konten, ruang terpakai maksimal.
 * • Slide mengisi tinggi layar (tidak ada area kosong besar di bawah).
 * • Navigasi: tombol Lanjut, swipe/drag kiri-kanan, dan klik indikator.
 * • Slide terakhir berisi preferensi awal: tema tampilan & pengingat otomatis.
 * Ditampilkan sekali untuk pengguna baru (localStorage 'mm-intro'),
 * dan bisa diputar ulang dari halaman login.
 */

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bell,
  CircleDollarSign,
  Route,
  ShieldCheck,
  SunMoon,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'system', label: 'Sistem' },
] as const

const SLIDE_COUNT = 3

/** container variant: slide masuk dari arah geser */
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 90, scale: 0.97 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -90, scale: 0.97 }),
}

/** item muncul berurutan */
const stagger = {
  center: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.02 } },
}

const rise = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export function IntroView({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const [dir, setDir] = useState(1)
  const { setTheme } = useTheme()
  const [reminder, setReminder] = useState(true)
  const last = slide === SLIDE_COUNT - 1

  function finish() {
    try {
      localStorage.setItem('mm-intro', '1')
      localStorage.setItem('rc-reminder', reminder ? '1' : '0')
    } catch {
      /* penyimpanan penuh — abaikan */
    }
    onDone()
  }

  const go = useCallback(
    (next: number, direction: number) => {
      const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, next))
      if (clamped === slide) return
      setDir(direction)
      setSlide(clamped)
    },
    [slide]
  )

  function next() {
    if (last) finish()
    else go(slide + 1, 1)
  }

  function back() {
    go(slide - 1, -1)
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background">
      <div className="flex w-full max-w-[420px] flex-col px-4 pb-5 pt-4 sm:px-5">
        {/* Header: logo + lewati */}
        <div className="flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime">
              <Bike size={17} className="text-on-lime" />
            </span>
            <span className="text-[14px] font-extrabold tracking-tight text-foreground">
              MotoMate
            </span>
          </motion.span>
          <motion.button
            type="button"
            onClick={finish}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="press rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            Lewati
          </motion.button>
        </div>

        {/* Isi slide — mengisi sisa tinggi layar */}
        <div className="relative mt-4 flex-1">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {slide === 0 && (
              <motion.section
                key="s0"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -56) next()
                  else if (info.offset.x > 56) back()
                }}
                className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-[32px] border border-border/60 bg-card p-6 active:cursor-grabbing sm:p-7"
              >
                <motion.div variants={stagger} initial="enter" animate="center" exit="exit" className="flex flex-1 flex-col">
                  {/* Komposisi ikon fitur — menggantikan badge sparkle */}
                  <motion.div variants={rise} className="flex items-center justify-center py-2">
                    <div className="relative">
                      {/* cincin dekoratif */}
                      <motion.span
                        aria-hidden="true"
                        className="absolute -inset-7 rounded-full border border-dashed border-lime/50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
                      />
                      <span className="relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-lime shadow-[0_10px_30px_rgba(163,230,53,0.35)]">
                        <Bike size={38} className="text-on-lime" strokeWidth={2} />
                      </span>
                      {/* chip ikon mengambang */}
                      <motion.span
                        className="absolute -left-11 top-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Wrench size={17} className="text-foreground" />
                      </motion.span>
                      <motion.span
                        className="absolute -right-12 top-8 flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm"
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                      >
                        <Route size={17} className="text-foreground" />
                      </motion.span>
                      <motion.span
                        className="absolute -bottom-4 left-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm"
                        animate={{ y: [0, 5, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                      >
                        <CircleDollarSign size={17} className="text-foreground" />
                      </motion.span>
                    </div>
                  </motion.div>

                  <motion.h1
                    variants={rise}
                    className="mt-7 text-center text-[27px] font-extrabold leading-tight tracking-tight text-foreground"
                  >
                    Teman Setia
                    <br />
                    Perawatan Motor
                  </motion.h1>
                  <motion.p
                    variants={rise}
                    className="mx-auto mt-3 max-w-[300px] text-center text-[14px] leading-relaxed text-muted-foreground"
                  >
                    MotoMate membantu kamu merawat motor tanpa ribet — tahu kapan
                    komponen perlu diganti, mencatat perjalanan, dan mengontrol
                    pengeluaran.
                  </motion.p>

                  <motion.div variants={rise} className="mt-auto pt-6">
                    <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5">
                      <ShieldCheck size={18} className="shrink-0 text-foreground" />
                      <p className="text-[12px] font-semibold leading-snug text-muted-foreground">
                        Datamu tersimpan aman di akunmu sendiri — tidak ada data
                        contoh, semua mulai bersih.
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.section>
            )}

            {slide === 1 && (
              <motion.section
                key="s1"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -56) next()
                  else if (info.offset.x > 56) back()
                }}
                className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-[32px] border border-border/60 bg-card p-6 active:cursor-grabbing sm:p-7"
              >
                <motion.div variants={stagger} initial="enter" animate="center" exit="exit" className="flex flex-1 flex-col">
                  <motion.h1
                    variants={rise}
                    className="text-[24px] font-extrabold leading-tight tracking-tight text-foreground"
                  >
                    Apa saja isinya?
                  </motion.h1>
                  <motion.p variants={rise} className="mt-1.5 text-[13px] text-muted-foreground">
                    Geser untuk melihat — tiga fitur utama yang siap membantu.
                  </motion.p>

                  <div className="flex flex-1 flex-col justify-center gap-3.5 py-4">
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
                    ).map((f, i) => {
                      const Icon = f.icon
                      return (
                        <motion.div
                          key={f.title}
                          variants={rise}
                          whileHover={{ x: 4 }}
                          className="flex items-start gap-3.5 rounded-2xl border border-border/50 p-4"
                        >
                          <span
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-foreground',
                              i === 0 && 'bg-lime text-on-lime',
                              i !== 0 && 'bg-muted'
                            )}
                          >
                            <Icon size={19} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[14px] font-extrabold text-foreground">{f.title}</p>
                            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                              {f.desc}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              </motion.section>
            )}

            {slide === 2 && (
              <motion.section
                key="s2"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 56) back()
                }}
                className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-[32px] border border-border/60 bg-card p-6 active:cursor-grabbing sm:p-7"
              >
                <motion.div variants={stagger} initial="enter" animate="center" exit="exit" className="flex flex-1 flex-col">
                  <motion.span
                    variants={rise}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime"
                  >
                    <SunMoon size={20} className="text-on-lime" />
                  </motion.span>
                  <motion.h1
                    variants={rise}
                    className="mt-4 text-[24px] font-extrabold leading-tight tracking-tight text-foreground"
                  >
                    Sesuaikan seleramu
                  </motion.h1>
                  <motion.p variants={rise} className="mt-1.5 text-[13px] text-muted-foreground">
                    Preferensi ini bisa diubah kapan saja di Pengaturan.
                  </motion.p>

                  <motion.div variants={rise} className="flex flex-1 flex-col justify-center gap-4 py-4">
                    {/* Tema */}
                    <div className="rounded-2xl border border-border/50 p-4">
                      <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                        <SunMoon size={13} />
                        Tema tampilan
                      </p>
                      <div className="mt-2.5 grid grid-cols-3 gap-2">
                        {THEME_OPTIONS.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setTheme(t.value)}
                            className="press min-h-11 rounded-2xl border border-input bg-card text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pengingat */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 px-4 py-3.5">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Bell size={16} className="text-foreground" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-extrabold text-foreground">
                            Pengingat Otomatis
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            Notifikasi saat komponen mendekati batas pakai
                          </p>
                        </div>
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
                        <motion.span
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                          className={cn(
                            'absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink shadow-sm',
                            reminder && 'translate-x-5'
                          )}
                        />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Navigasi */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onClick={() => go(i, i > slide ? 1 : -1)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === slide ? 'w-6 bg-foreground' : 'w-1.5 bg-border'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {slide > 0 && (
              <motion.button
                type="button"
                onClick={back}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                aria-label="Kembali ke slide sebelumnya"
                className="press flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card text-foreground"
              >
                <ArrowLeft size={18} />
              </motion.button>
            )}
            <button
              type="button"
              onClick={next}
              className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-lime px-6 text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105"
            >
              {last ? 'Mulai Sekarang' : 'Lanjut'}
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <ArrowRight size={17} strokeWidth={2.4} />
              </motion.span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
