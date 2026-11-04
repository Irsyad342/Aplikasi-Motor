'use client'

/**
 * IntroView — perkenalan MotoMate (bisa digeser / swipe).
 * • Setiap slide terisi penuh: tidak ada ruang kosong besar, semua bagian
 *   disebar rapi (justify-evenly) dan diisi elemen bermakna.
 * • Slide 1: chip fitur mini mengisi bagian tengah.
 * • Slide 2: kartu fitur melebar mengisi tinggi kartu.
 * • Slide 3: pratinjau tema visual (bukan tombol polos) + toggle pengingat,
 *   tersebar merata — minimalis tapi tidak kosong.
 * • Animasi halus & ringan: stagger masuk, hover lembut, indikator spring.
 * Ditampilkan sekali untuk pengguna baru (localStorage 'mm-intro'),
 * dan bisa diputar ulang dari halaman login.
 */

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bike,
  Check,
  CircleDollarSign,
  Lightbulb,
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
  center: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
  exit: { transition: { staggerChildren: 0.02 } },
}

const rise = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

/** kartu slide — dipakai ketiga slide agar konsisten */
const cardCls =
  'absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-[32px] border border-border/60 bg-card p-5 active:cursor-grabbing sm:p-7'

function SwipeSection({
  k,
  dir,
  onSwipeLeft,
  onSwipeRight,
  children,
}: {
  k: string
  dir: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  children: React.ReactNode
}) {
  return (
    <motion.section
      key={k}
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
        if (info.offset.x < -56) onSwipeLeft?.()
        else if (info.offset.x > 56) onSwipeRight?.()
      }}
      className={cardCls}
    >
      {children}
    </motion.section>
  )
}

/* ---------- pratinjau mini untuk tiap tema (warna tetap, tidak ikut tema) ---------- */
function ThemePreview({ value }: { value: 'light' | 'dark' | 'system' }) {
  if (value === 'light') {
    return (
      <span className="flex h-[72px] w-full flex-col gap-1.5 overflow-hidden rounded-xl bg-white p-2 ring-1 ring-black/10">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#dfff00]" />
          <span className="h-1.5 w-1/2 rounded-full bg-[#101110]/60" />
        </span>
        <span className="h-1.5 w-3/4 rounded-full bg-[#101110]/35" />
        <span className="h-1.5 w-2/3 rounded-full bg-[#101110]/20" />
        <span className="mt-auto h-4 w-full rounded-md bg-[#dfff00]" />
      </span>
    )
  }
  if (value === 'dark') {
    return (
      <span className="flex h-[72px] w-full flex-col gap-1.5 overflow-hidden rounded-xl bg-[#101110] p-2 ring-1 ring-white/15">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#dfff00]" />
          <span className="h-1.5 w-1/2 rounded-full bg-[#f3f3f0]/60" />
        </span>
        <span className="h-1.5 w-3/4 rounded-full bg-[#f3f3f0]/35" />
        <span className="h-1.5 w-2/3 rounded-full bg-[#f3f3f0]/20" />
        <span className="mt-auto h-4 w-full rounded-md bg-[#dfff00]" />
      </span>
    )
  }
  // sistem: kiri terang, kanan gelap
  return (
    <span className="relative flex h-[72px] w-full overflow-hidden rounded-xl ring-1 ring-black/10">
      <span className="flex w-1/2 flex-col gap-1.5 bg-white p-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#dfff00]" />
          <span className="h-1.5 w-full rounded-full bg-[#101110]/60" />
        </span>
        <span className="h-1.5 w-3/4 rounded-full bg-[#101110]/35" />
        <span className="h-1.5 w-2/3 rounded-full bg-[#101110]/20" />
      </span>
      <span className="flex w-1/2 flex-col gap-1.5 bg-[#101110] p-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#dfff00]" />
          <span className="h-1.5 w-full rounded-full bg-[#f3f3f0]/60" />
        </span>
        <span className="h-1.5 w-3/4 rounded-full bg-[#f3f3f0]/35" />
        <span className="h-1.5 w-2/3 rounded-full bg-[#f3f3f0]/20" />
      </span>
      <span aria-hidden="true" className="absolute inset-x-2 bottom-2 h-4 rounded-md bg-[#dfff00]" />
    </span>
  )
}

export function IntroView({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const [dir, setDir] = useState(1)
  const { setTheme: applyTheme } = useTheme()
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system')
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

  function pickTheme(v: 'light' | 'dark' | 'system') {
    setThemeState(v)
    applyTheme(v)
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
            {/* ---------- SLIDE 1 — perkenalan ---------- */}
            {slide === 0 && (
              <SwipeSection k="s0" dir={dir} onSwipeLeft={next} onSwipeRight={back}>
                <motion.div variants={stagger} initial="enter" animate="center" exit="exit" className="flex flex-1 flex-col">
                  <motion.div variants={rise} className="flex items-center justify-center pt-2">
                    <div className="relative">
                      {/* cincin dekoratif */}
                      <motion.span
                        aria-hidden="true"
                        className="absolute -inset-10 rounded-full border border-dashed border-lime/50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
                      />
                      <span className="relative flex h-24 w-24 items-center justify-center rounded-[30px] bg-lime shadow-[0_14px_38px_rgba(163,230,53,0.4)]">
                        <Bike size={46} className="text-on-lime" strokeWidth={2} />
                      </span>
                      {/* chip ikon mengambang */}
                      <motion.span
                        className="absolute -left-14 top-0 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm"
                        animate={{ y: [0, -7, 0] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Wrench size={21} className="text-foreground" />
                      </motion.span>
                      <motion.span
                        className="absolute -right-14 top-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm"
                        animate={{ y: [0, 7, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                      >
                        <Route size={21} className="text-foreground" />
                      </motion.span>
                      <motion.span
                        className="absolute -bottom-5 left-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm"
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                      >
                        <CircleDollarSign size={21} className="text-foreground" />
                      </motion.span>
                    </div>
                  </motion.div>

                  <motion.h1
                    variants={rise}
                    className="mt-6 text-center text-[26px] font-extrabold leading-tight tracking-tight text-foreground"
                  >
                    Teman Setia
                    <br />
                    Perawatan Motor
                  </motion.h1>
                  <motion.p
                    variants={rise}
                    className="mx-auto mt-2.5 max-w-[300px] text-center text-[13.5px] leading-relaxed text-muted-foreground"
                  >
                    MotoMate membantu kamu merawat motor tanpa ribet: tahu kapan
                    komponen perlu diganti, mencatat perjalanan, dan mengontrol
                    pengeluaran.
                  </motion.p>

                  {/* pengisi tengah: 3 chip fitur + catatan keamanan */}
                  <div className="flex flex-1 flex-col justify-evenly py-4">
                    <motion.div variants={rise} className="grid grid-cols-3 gap-2.5">
                      {(
                        [
                          { icon: Wrench, label: 'Komponen' },
                          { icon: Route, label: 'Perjalanan' },
                          { icon: CircleDollarSign, label: 'Biaya' },
                        ] as const
                      ).map((c, i) => {
                        const Icon = c.icon
                        return (
                          <motion.div
                            key={c.label}
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              duration: 2.4 + i * 0.3,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.35,
                            }}
                            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/50 bg-background/60 px-2 py-3"
                          >
                            <span
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-xl',
                                i === 0 ? 'bg-lime text-on-lime' : 'bg-muted text-foreground'
                              )}
                            >
                              <Icon size={16} />
                            </span>
                            <span className="text-[11px] font-extrabold text-foreground">
                              {c.label}
                            </span>
                          </motion.div>
                        )
                      })}
                    </motion.div>

                    <motion.div
                      variants={rise}
                      className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5"
                    >
                      <ShieldCheck size={18} className="shrink-0 text-foreground" />
                      <p className="text-[12px] font-semibold leading-snug text-muted-foreground">
                        Datamu tersimpan aman di akunmu sendiri. Tidak ada data
                        contoh, semua mulai bersih.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </SwipeSection>
            )}

            {/* ---------- SLIDE 2 — fitur ---------- */}
            {slide === 1 && (
              <SwipeSection k="s1" dir={dir} onSwipeLeft={next} onSwipeRight={back}>
                <motion.div variants={stagger} initial="enter" animate="center" exit="exit" className="flex flex-1 flex-col">
                  <motion.h1
                    variants={rise}
                    className="text-[24px] font-extrabold leading-tight tracking-tight text-foreground"
                  >
                    Apa saja isinya?
                  </motion.h1>
                  <motion.p variants={rise} className="mt-1 text-[13px] text-muted-foreground">
                    Tiga fitur utama yang siap membantu tiap hari.
                  </motion.p>

                  {/* kartu fitur melebar — tiap kartu mengisi tinggi secara proporsional */}
                  <div className="flex flex-1 flex-col gap-3 pt-3.5">
                    {(
                      [
                        {
                          icon: Wrench,
                          title: 'Pemantau komponen',
                          desc: 'Oli, busi, rem, hingga filter. Sisa pakai dihitung otomatis dari odometer & waktu.',
                        },
                        {
                          icon: Route,
                          title: 'Rekam perjalanan GPS',
                          desc: 'Rute, jarak, dan durasi terekam otomatis saat kamu berkendara.',
                        },
                        {
                          icon: CircleDollarSign,
                          title: 'Biaya & analitik',
                          desc: 'Bensin, parkir, servis. Lihat grafik pengeluaran bulanan biar hemat.',
                        },
                      ] as const
                    ).map((f, i) => {
                      const Icon = f.icon
                      return (
                        <motion.div
                          key={f.title}
                          variants={rise}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.985 }}
                          className="flex flex-1 items-center gap-3.5 rounded-2xl border border-border/50 px-4"
                        >
                          <motion.span
                            animate={i === 0 ? { rotate: [0, -8, 0] } : undefined}
                            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                            className={cn(
                              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                              i === 0 ? 'bg-lime text-on-lime' : 'bg-muted text-foreground'
                            )}
                          >
                            <Icon size={20} />
                          </motion.span>
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
              </SwipeSection>
            )}

            {/* ---------- SLIDE 3 — preferensi ---------- */}
            {slide === 2 && (
              <SwipeSection k="s2" dir={dir} onSwipeRight={back}>
                <motion.div variants={stagger} initial="enter" animate="center" exit="exit" className="flex flex-1 flex-col">
                  <motion.span
                    variants={rise}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime"
                  >
                    <SunMoon size={20} className="text-on-lime" />
                  </motion.span>
                  <motion.h1
                    variants={rise}
                    className="mt-3.5 text-[24px] font-extrabold leading-tight tracking-tight text-foreground"
                  >
                    Sesuaikan seleramu
                  </motion.h1>
                  <motion.p variants={rise} className="mt-1 text-[13px] text-muted-foreground">
                    Preferensi ini bisa diubah kapan saja di Pengaturan.
                  </motion.p>

                  {/* konten disebar rata — tidak menyisakan ruang kosong tunggal */}
                  <div className="flex flex-1 flex-col justify-evenly pt-2">
                    {/* Tema: pratinjau visual */}
                    <motion.div variants={rise}>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <SunMoon size={12} />
                        Tema tampilan
                      </p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {THEME_OPTIONS.map((t) => {
                          const active = theme === t.value
                          return (
                            <motion.button
                              key={t.value}
                              type="button"
                              onClick={() => pickTheme(t.value)}
                              whileTap={{ scale: 0.94 }}
                              animate={{ scale: active ? 1.02 : 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                              aria-pressed={active}
                              className={cn(
                                'relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 pt-2 transition-colors',
                                active
                                  ? 'border-lime bg-lime/10'
                                  : 'border-border/50 bg-background/40'
                              )}
                            >
                              <span className="relative w-full">
                                <ThemePreview value={t.value} />
                              </span>
                              <span className="text-[11.5px] font-extrabold text-foreground">
                                {t.label}
                              </span>
                              {active && (
                                <motion.span
                                  layoutId="intro-theme-check"
                                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-on-lime shadow-sm"
                                >
                                  <Check size={12} strokeWidth={3} />
                                </motion.span>
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    </motion.div>

                    {/* Pengingat */}
                    <motion.div
                      variants={rise}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 px-4 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Bell size={17} className="text-foreground" />
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
                    </motion.div>

                    {/* Tips — mengisi ruang bawah dengan info bermanfaat */}
                    <motion.div
                      variants={rise}
                      className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime">
                        <Lightbulb size={16} className="text-on-lime" />
                      </span>
                      <p className="text-[12px] font-semibold leading-snug text-muted-foreground">
                        <span className="font-extrabold text-foreground">Tips:</span> mode Gelap
                        bikin nyaman dipakai malam hari, ubah kapan saja di Pengaturan.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </SwipeSection>
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
