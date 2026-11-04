'use client'

/**
 * IntroView — Welcome Screen & Onboarding MotoMate (total redesign).
 * Struktur (mengikuti referensi desain modern):
 * • ATAS   : brand MotoMate (logo + wordmark) dan tombol Lewati.
 * • TENGAH : ilustrasi besar yang dibangun murni dari CSS + ikon
 *            (smartphone profil kendaraan, perawatan, riwayat & biaya),
 *            bisa digeser (swipe) ke kiri/kanan.
 * • BAWAH  : card info (rounded-top) berisi pagination indicator animasi,
 *            judul + deskripsi, dan tombol Lanjut / Mulai Sekarang.
 * Konten 3 slide:
 * 1. "Your Motorcycle, One Place"       — manajemen kendaraan.
 * 2. "Never Miss Your Maintenance"      — pengingat perawatan pintar.
 * 3. "Everything Under Control"         — riwayat servis & pengeluaran.
 * Animasi ringan: hanya transform & opacity (float, fade, geser),
 * menghormati prefers-reduced-motion. Tema mengikuti sistem aplikasi
 * (token bg-background/bg-card), tanpa sistem tema terpisah.
 * Ditampilkan sekali untuk pengguna baru (localStorage 'mm-intro'),
 * dan bisa diputar ulang dari halaman login.
 */

import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Bike,
  CalendarDays,
  ChartColumn,
  Disc3,
  Droplets,
  Gauge,
  Receipt,
  ShieldCheck,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SLIDES = [
  {
    key: 'kendaraan',
    title: 'Your Motorcycle, One Place',
    desc: 'Kelola informasi kendaraan dan pantau kondisi motor dengan lebih mudah dalam satu aplikasi.',
  },
  {
    key: 'perawatan',
    title: 'Never Miss Your Maintenance',
    desc: 'Pantau jadwal servis, penggantian oli, dan komponen kendaraan dengan pengingat yang lebih praktis.',
  },
  {
    key: 'riwayat',
    title: 'Everything Under Control',
    desc: 'Catat riwayat perawatan dan pengeluaran kendaraan agar pengelolaan motor menjadi lebih teratur.',
  },
] as const

/** slide masuk/keluar mengikuti arah geser */
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 76 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -76 }),
}

/** judul + deskripsi ikut bergerak halus saat berganti slide */
const textVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 26, y: 6 }),
  center: { opacity: 1, x: 0, y: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -26, y: -6 }),
}

const EASE = [0.22, 1, 0.36, 1] as const

/* ---------- elemen ilustrasi yang dipakai bersama ---------- */

/** chip kecil mengambang (animasi float, transform saja) */
function FloatChip({
  className,
  icon: Icon,
  label,
  sub,
  tone,
  reduce,
  delay = 0,
}: {
  className?: string
  icon: LucideIcon
  label: string
  sub?: string
  tone?: 'lime'
  reduce: boolean
  delay?: number
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={reduce ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className={cn(
        'absolute z-10 flex items-center gap-1.5 rounded-xl border border-border/60 px-2 py-1.5 shadow-lg shadow-black/5',
        tone === 'lime' ? 'border-lime bg-lime' : 'bg-card',
        className
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
          tone === 'lime' ? 'bg-on-lime/15 text-on-lime' : 'bg-muted text-foreground'
        )}
      >
        <Icon size={12} strokeWidth={2.3} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block whitespace-nowrap text-[10px] font-extrabold leading-tight',
            tone === 'lime' ? 'text-on-lime' : 'text-foreground'
          )}
        >
          {label}
        </span>
        {sub && (
          <span
            className={cn(
              'block whitespace-nowrap text-[8.5px] font-semibold leading-tight',
              tone === 'lime' ? 'text-on-lime/75' : 'text-muted-foreground'
            )}
          >
            {sub}
          </span>
        )}
      </span>
    </motion.div>
  )
}

/** bingkai smartphone untuk ilustrasi slide 1 & 3 */
function PhoneFrame({ reduce, children }: { reduce: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      aria-hidden="true"
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-[178px] rounded-[30px] border border-border/70 bg-card p-2.5 shadow-[0_24px_48px_-16px_rgba(16,17,16,0.28)] transition-colors duration-300 sm:w-[198px]"
    >
      <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-12 rounded-full bg-border" />
      {children}
    </motion.div>
  )
}

/* ---------- ILUSTRASI SLIDE 1: smartphone profil kendaraan ---------- */
function IllustrationVehicle({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <span aria-hidden="true" className="absolute h-[230px] w-[230px] rounded-full bg-lime/15 blur-3xl" />
      <motion.span
        aria-hidden="true"
        className="absolute h-[292px] w-[292px] rounded-full border border-dashed border-lime/50"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      />
      <span aria-hidden="true" className="absolute h-[344px] w-[344px] rounded-full border border-border/50" />

      <div className="relative">
        <PhoneFrame reduce={reduce}>
          {/* bar aplikasi mini */}
          <div className="flex items-center gap-1.5 px-1 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-lime">
              <Bike size={11} className="text-on-lime" strokeWidth={2.4} />
            </span>
            <span className="text-[9px] font-extrabold tracking-tight text-foreground">MotoMate</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              <span className="text-[7.5px] font-bold text-muted-foreground">Siap</span>
            </span>
          </div>

        {/* kartu kendaraan */}
        <div className="rounded-[18px] bg-lime p-2.5 text-on-lime">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-on-lime/15">
              <Bike size={15} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10.5px] font-extrabold leading-tight">Honda Beat 110</p>
              <p className="text-[8.5px] font-bold uppercase tracking-wider opacity-70">B 6421 XYZ</p>
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between rounded-[14px] bg-on-lime/10 px-2.5 py-1.5">
            <div>
              <p className="text-[7.5px] font-bold uppercase tracking-wider opacity-70">Odometer</p>
              <p className="text-[14px] font-extrabold leading-tight tabular-nums">12.480 km</p>
            </div>
            <Gauge size={14} className="opacity-70" />
          </div>
        </div>

        {/* kondisi komponen */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 rounded-xl bg-muted px-2.5 py-1.5">
            <Droplets size={11} className="shrink-0 text-ok" strokeWidth={2.4} />
            <span className="text-[9.5px] font-bold text-foreground">Oli mesin</span>
            <span className="ml-auto text-[9px] font-extrabold text-ok">Sehat</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted px-2.5 py-1.5">
            <Disc3 size={11} className="shrink-0 text-warn" strokeWidth={2.4} />
            <span className="text-[9.5px] font-bold text-foreground">Rem cakram</span>
            <span className="ml-auto text-[9px] font-extrabold text-warn">Cek 40%</span>
          </div>
        </div>

        {/* kesehatan motor */}
        <div className="px-1 pb-1 pt-2">
          <div className="flex items-center justify-between text-[8px] font-bold text-muted-foreground">
            <span>Kesehatan motor</span>
            <span className="text-foreground">86%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[86%] rounded-full bg-lime" />
          </div>
        </div>
        </PhoneFrame>

        <FloatChip className="right-[calc(100%-10px)] top-3" icon={Gauge} label="12.480 km" sub="odometer" reduce={reduce} />
        <FloatChip
          className="left-[calc(100%-10px)] bottom-3"
          icon={ShieldCheck}
          label="Kondisi baik"
          sub="siap dipakai"
          tone="lime"
          reduce={reduce}
          delay={0.7}
        />
      </div>
    </div>
  )
}

/* ---------- ILUSTRASI SLIDE 2: motor + kalender, oli, alat, pengingat ---------- */
function IllustrationMaintenance({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <span aria-hidden="true" className="absolute h-[230px] w-[230px] rounded-full bg-lime/15 blur-3xl" />
      <span aria-hidden="true" className="absolute h-[320px] w-[320px] rounded-full border border-border/50" />

      <div className="relative flex h-[300px] w-[300px] items-center justify-center">
        {/* motor di tengah */}
        <div className="relative">
          <motion.span
            aria-hidden="true"
            className="absolute -inset-9 rounded-full border border-dashed border-lime/50"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute -inset-[64px] rounded-full border border-border/50"
          />
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-28 w-28 items-center justify-center rounded-[34px] bg-lime shadow-[0_18px_44px_-8px_rgba(163,230,53,0.55)]"
          >
            <Bike size={54} className="text-on-lime" strokeWidth={2} />
          </motion.div>
        </div>

        <FloatChip className="left-0 top-2" icon={CalendarDays} label="Servis rutin" sub="12 Juni, bengkel" reduce={reduce} />
        <FloatChip className="right-0 top-10" icon={Droplets} label="Oli mesin" sub="72% sisa pakai" reduce={reduce} delay={0.5} />
        <FloatChip className="bottom-9 left-0" icon={Wrench} label="Rantai & gir" sub="cek 250 km lagi" reduce={reduce} delay={0.25} />
        <FloatChip className="bottom-1 right-0" icon={BellRing} label="Pengingat aktif" tone="lime" reduce={reduce} delay={0.8} />
      </div>
    </div>
  )
}

/* ---------- ILUSTRASI SLIDE 3: smartphone riwayat & grafik biaya ---------- */
function IllustrationHistory({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <span aria-hidden="true" className="absolute h-[230px] w-[230px] rounded-full bg-lime/15 blur-3xl" />
      <motion.span
        aria-hidden="true"
        className="absolute h-[292px] w-[292px] rounded-full border border-dashed border-lime/50"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      />
      <span aria-hidden="true" className="absolute h-[344px] w-[344px] rounded-full border border-border/50" />

      <div className="relative">
        <PhoneFrame reduce={reduce}>
          {/* bar aplikasi mini */}
          <div className="flex items-center gap-1.5 px-1 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-lime">
              <ChartColumn size={11} className="text-on-lime" strokeWidth={2.4} />
            </span>
            <span className="text-[9px] font-extrabold tracking-tight text-foreground">Riwayat & Biaya</span>
          </div>

        {/* grafik pengeluaran */}
        <div className="rounded-[18px] bg-muted p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Pengeluaran</p>
            <p className="text-[8.5px] font-extrabold text-foreground">6 bulan</p>
          </div>
          <div className="mt-2 flex h-16 items-end gap-1.5">
            {[38, 56, 44, 70, 52, 88].map((h, i) => (
              <span
                key={i}
                className={cn('flex-1 rounded-t-md transition-colors', i === 5 ? 'bg-lime' : 'bg-border')}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[7px] font-bold text-muted-foreground">
            <span>Jan</span>
            <span>Mar</span>
            <span>Mei</span>
          </div>
        </div>

        {/* catatan perawatan */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 rounded-xl bg-muted px-2.5 py-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-lime">
              <Droplets size={11} className="text-on-lime" strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[9.5px] font-extrabold leading-tight text-foreground">Oli mesin</span>
              <span className="text-[8px] font-semibold text-muted-foreground">12 Mei</span>
            </span>
            <span className="ml-auto text-[9px] font-extrabold tabular-nums text-foreground">Rp 85rb</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted px-2.5 py-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-border">
              <Wrench size={11} className="text-foreground" strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[9.5px] font-extrabold leading-tight text-foreground">Servis rutin</span>
              <span className="text-[8px] font-semibold text-muted-foreground">28 Apr</span>
            </span>
            <span className="ml-auto text-[9px] font-extrabold tabular-nums text-foreground">Rp 150rb</span>
          </div>
        </div>
        </PhoneFrame>

        <FloatChip className="left-[calc(100%-10px)] top-3" icon={Wallet} label="Rp 235rb" sub="bulan ini" reduce={reduce} delay={0.3} />
        <FloatChip className="right-[calc(100%-10px)] bottom-3" icon={Receipt} label="18 catatan" sub="tersimpan rapi" reduce={reduce} delay={0.8} />
      </div>
    </div>
  )
}

const ILLUSTRATIONS = [IllustrationVehicle, IllustrationMaintenance, IllustrationHistory]

/* ---------- komponen utama ---------- */
export function IntroView({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const [dir, setDir] = useState(1)
  const reduce = useReducedMotion() ?? false
  const doneRef = useRef(false)
  const last = slide === SLIDES.length - 1

  const go = useCallback(
    (next: number, direction: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next))
      if (clamped === slide) return
      setDir(direction)
      setSlide(clamped)
    },
    [slide]
  )

  /** menuju login: tandai intro selesai (dilindungi dari double call) */
  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    try {
      localStorage.setItem('mm-intro', '1')
    } catch {
      /* penyimpanan penuh, abaikan */
    }
    onDone()
  }, [onDone])

  const next = useCallback(() => {
    if (last) finish()
    else go(slide + 1, 1)
  }, [last, slide, go, finish])

  const back = useCallback(() => go(slide - 1, -1), [slide, go])

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      // gabung offset + velocity agar flick pendek tetap terasa responsif
      const flick = info.offset.x + info.velocity.x * 0.18
      if (flick < -56) go(slide + 1, 1)
      else if (flick > 56) go(slide - 1, -1)
    },
    [slide, go]
  )

  const Ill = ILLUSTRATIONS[slide]

  return (
    <div className="flex min-h-dvh select-none justify-center bg-background transition-colors duration-300">
      <div className="flex w-full max-w-[430px] flex-col overflow-hidden">
        {/* ===== ATAS: brand + Lewati ===== */}
        <header className="flex items-center justify-between px-5 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime shadow-[0_6px_18px_-4px_rgba(163,230,53,0.5)]">
              <Bike size={17} className="text-on-lime" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight text-foreground">MotoMate</span>
          </motion.span>
          <motion.button
            type="button"
            onClick={finish}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="press rounded-full bg-muted px-4 py-2 text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            Lewati
          </motion.button>
        </header>

        {/* ===== TENGAH: ilustrasi besar, bisa digeser ===== */}
        <main className="relative flex-1 overflow-hidden" aria-hidden="true">
          <AnimatePresence initial={false} custom={dir}>
            <motion.section
              key={slide}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.15 } : { duration: 0.34, ease: EASE }}
              drag={reduce ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={onDragEnd}
              className="absolute inset-0 flex cursor-grab flex-col items-center justify-center px-4 active:cursor-grabbing sm:px-6"
            >
              <Ill reduce={reduce} />
            </motion.section>
          </AnimatePresence>
        </main>

        {/* ===== BAWAH: card info (pagination + judul + tombol) ===== */}
        <footer className="relative z-10 rounded-t-[30px] border border-b-0 border-border/70 bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-10px_36px_-18px_rgba(16,17,16,0.18)] transition-colors duration-300">
          <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-border" />

          {/* pagination indicator — bisa diklik, pill aktif beranimasi */}
          <div className="mt-3 flex items-center justify-center" role="tablist" aria-label="Slide perkenalan">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === slide}
                aria-label={`Slide ${i + 1}: ${s.title}`}
                onClick={() => go(i, i > slide ? 1 : -1)}
                className="grid h-7 place-items-center rounded-full px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {i === slide ? (
                  <motion.span
                    layoutId="intro-dot"
                    className="block h-1.5 w-7 rounded-full bg-foreground"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                ) : (
                  <span className="block h-1.5 w-1.5 rounded-full bg-border transition-colors" />
                )}
              </button>
            ))}
          </div>

          {/* judul + deskripsi */}
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={slide}
              custom={dir}
              variants={textVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.12 } : { duration: 0.3, ease: EASE }}
            >
              <h1 className="mt-3 text-center text-[22px] font-extrabold leading-[1.15] tracking-tight text-foreground">
                {SLIDES[slide].title}
              </h1>
              <p className="mx-auto mt-2 max-w-[310px] text-center text-[13px] leading-relaxed text-muted-foreground">
                {SLIDES[slide].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* tombol navigasi */}
          <div className="mt-5 flex items-center gap-2.5 px-0">
            {slide > 0 && (
              <button
                type="button"
                onClick={back}
                aria-label="Slide sebelumnya"
                className="press flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="press inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-lime text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105"
            >
              {last ? 'Mulai Sekarang' : 'Lanjut'}
              <motion.span
                aria-hidden="true"
                animate={reduce || last ? undefined : { x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <ArrowRight size={17} strokeWidth={2.5} />
              </motion.span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
