'use client'

/**
 * IntroView — Welcome Screen & Onboarding MotoMate.
 * Struktur:
 * • ATAS   : brand MotoMate (logo + wordmark) dan tombol Lewati.
 * • TENGAH : ilustrasi besar dari CSS murni (smartphone profil kendaraan,
 *            perawatan, riwayat & biaya). Tiga slide berdiri di sebuah
 *            track yang digeser dengan translateX — tanpa mount/unmount,
 *            tanpa gesture, tanpa library animasi.
 * • BAWAH  : indikator halaman (bisa diklik) + tombol kembali kecil,
 *            judul + deskripsi, lalu satu tombol utama lebar penuh
 *            (Lanjut / Mulai Sekarang).
 * Navigasi sengaja TANPA geser (swipe): cukup tombol agar ringan dan
 * responsif di semua HP. Semua animasi berulang memakai CSS murni
 * (hanya transform dan opacity) sehingga berjalan di compositor GPU dan
 * tidak membebani thread JavaScript; otomatis nonaktif saat
 * prefers-reduced-motion aktif. Selesai ditandai di localStorage
 * 'mm-intro', dan bisa diputar ulang dari halaman login.
 */

import { useCallback, useRef, useState, type ReactNode } from 'react'
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

/* ---------- elemen ilustrasi yang dipakai bersama ---------- */

/** chip kecil mengambang — animasi CSS float, hanya saat slide aktif */
function FloatChip({
  className,
  icon: Icon,
  label,
  sub,
  tone,
  active,
  delay = 0,
}: {
  className?: string
  icon: LucideIcon
  label: string
  sub?: string
  tone?: 'lime'
  active: boolean
  delay?: number
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute z-10 flex items-center gap-1.5 rounded-xl border border-border/60 px-2 py-1.5 shadow-lg shadow-black/5',
        tone === 'lime' ? 'border-lime bg-lime' : 'bg-card',
        active && 'mm-float',
        className
      )}
      style={active && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
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
    </div>
  )
}

/** bingkai smartphone untuk ilustrasi slide 1 & 3 */
function PhoneFrame({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative w-[178px] rounded-[30px] border border-border/70 bg-card p-2.5 shadow-[0_24px_48px_-16px_rgba(16,17,16,0.28)] transition-colors duration-300 sm:w-[198px]',
        active && 'mm-float-slow'
      )}
    >
      <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-12 rounded-full bg-border" />
      {children}
    </div>
  )
}

/** cahaya lime lembut — radial gradient, jauh lebih ringan daripada blur */
function SoftGlow() {
  return (
    <span
      aria-hidden="true"
      className="absolute h-[260px] w-[260px] rounded-full bg-[radial-gradient(closest-side,rgba(223,255,0,0.16),transparent)]"
    />
  )
}

/* ---------- ILUSTRASI SLIDE 1: smartphone profil kendaraan ---------- */
function IllustrationVehicle({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <SoftGlow />
      <span
        aria-hidden="true"
        className={cn('absolute h-[292px] w-[292px] rounded-full border border-dashed border-lime/50', active && 'mm-spin')}
      />
      <span aria-hidden="true" className="absolute h-[344px] w-[344px] rounded-full border border-border/50" />

      <div className="relative">
        <PhoneFrame active={active}>
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

        <FloatChip active={active} className="right-[calc(100%-10px)] top-3" icon={Gauge} label="12.480 km" sub="odometer" />
        <FloatChip
          active={active}
          className="left-[calc(100%-10px)] bottom-3"
          icon={ShieldCheck}
          label="Kondisi baik"
          sub="siap dipakai"
          tone="lime"
          delay={0.7}
        />
      </div>
    </div>
  )
}

/* ---------- ILUSTRASI SLIDE 2: motor + kalender, oli, alat, pengingat ---------- */
function IllustrationMaintenance({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <SoftGlow />
      <span aria-hidden="true" className="absolute h-[320px] w-[320px] rounded-full border border-border/50" />

      <div className="relative flex h-[300px] w-[300px] items-center justify-center">
        {/* motor di tengah */}
        <div className="relative">
          <span
            aria-hidden="true"
            className={cn('absolute -inset-9 rounded-full border border-dashed border-lime/50', active && 'mm-spin')}
          />
          <span aria-hidden="true" className="absolute -inset-[64px] rounded-full border border-border/50" />
          <div
            className={cn(
              'relative flex h-28 w-28 items-center justify-center rounded-[34px] bg-lime shadow-[0_18px_44px_-8px_rgba(163,230,53,0.55)]',
              active && 'mm-float'
            )}
          >
            <Bike size={54} className="text-on-lime" strokeWidth={2} />
          </div>
        </div>

        <FloatChip active={active} className="left-0 top-2" icon={CalendarDays} label="Servis rutin" sub="12 Juni, bengkel" />
        <FloatChip active={active} className="right-0 top-10" icon={Droplets} label="Oli mesin" sub="72% sisa pakai" delay={0.5} />
        <FloatChip active={active} className="bottom-9 left-0" icon={Wrench} label="Rantai & gir" sub="cek 250 km lagi" delay={0.25} />
        <FloatChip active={active} className="bottom-1 right-0" icon={BellRing} label="Pengingat aktif" tone="lime" delay={0.8} />
      </div>
    </div>
  )
}

/* ---------- ILUSTRASI SLIDE 3: smartphone riwayat & grafik biaya ---------- */
function IllustrationHistory({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <SoftGlow />
      <span
        aria-hidden="true"
        className={cn('absolute h-[292px] w-[292px] rounded-full border border-dashed border-lime/50', active && 'mm-spin')}
      />
      <span aria-hidden="true" className="absolute h-[344px] w-[344px] rounded-full border border-border/50" />

      <div className="relative">
        <PhoneFrame active={active}>
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
                  className={cn('flex-1 rounded-t-md', i === 5 ? 'bg-lime' : 'bg-border')}
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

        <FloatChip active={active} className="left-[calc(100%-10px)] top-3" icon={Wallet} label="Rp 235rb" sub="bulan ini" delay={0.3} />
        <FloatChip active={active} className="right-[calc(100%-10px)] bottom-3" icon={Receipt} label="18 catatan" sub="tersimpan rapi" delay={0.8} />
      </div>
    </div>
  )
}

const ILLUSTRATIONS = [IllustrationVehicle, IllustrationMaintenance, IllustrationHistory]

/* ---------- komponen utama ---------- */
export function IntroView({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const doneRef = useRef(false)
  const last = slide === SLIDES.length - 1

  const go = useCallback((next: number) => {
    setSlide(Math.max(0, Math.min(SLIDES.length - 1, next)))
  }, [])

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
    else go(slide + 1)
  }, [last, slide, go, finish])

  const back = useCallback(() => go(slide - 1), [slide, go])

  return (
    <div className="flex min-h-dvh select-none justify-center bg-background transition-colors duration-300">
      <div className="flex w-full max-w-[430px] flex-col overflow-hidden">
        {/* ===== ATAS: brand + Lewati ===== */}
        <header className="flex items-center justify-between px-5 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <span className="mm-rise flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime shadow-[0_6px_18px_-4px_rgba(163,230,53,0.5)]">
              <Bike size={17} className="text-on-lime" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight text-foreground">MotoMate</span>
          </span>
          <button
            type="button"
            onClick={finish}
            className="press mm-rise rounded-full bg-muted px-4 py-2 text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            style={{ animationDelay: '0.06s' }}
          >
            Lewati
          </button>
        </header>

        {/* ===== TENGAH: track ilustrasi, digeser dengan transform CSS ===== */}
        <main className="relative flex-1 overflow-hidden" aria-hidden="true">
          <div
            className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {ILLUSTRATIONS.map((Ill, i) => (
              <section key={SLIDES[i].key} className="h-full w-full shrink-0 px-4 sm:px-6">
                <Ill active={slide === i} />
              </section>
            ))}
          </div>
        </main>

        {/* ===== BAWAH: indikator + teks + satu tombol utama ===== */}
        <footer className="relative z-10 rounded-t-[30px] border border-b-0 border-border/70 bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-10px_36px_-18px_rgba(16,17,16,0.18)] transition-colors duration-300">
          <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-border" />

          {/* baris indikator: tombol kembali kecil di kiri, dot di tengah */}
          <div className="relative mt-1 flex items-center justify-center">
            {slide > 0 && (
              <button
                type="button"
                onClick={back}
                aria-label="Slide sebelumnya"
                className="press absolute left-1 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="relative flex items-center" role="tablist" aria-label="Slide perkenalan">
              {/* indikator aktif bergeser dengan transform saja */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 z-10 h-1.5 w-7 rounded-full bg-foreground transition-transform duration-300 ease-out"
                style={{ marginTop: -3, transform: `translateX(${slide * 18 - 5}px)` }}
              />
              {SLIDES.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={i === slide}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  onClick={() => go(i)}
                  className="grid h-7 w-[18px] place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <span className="block h-1.5 w-1.5 rounded-full bg-border" />
                </button>
              ))}
            </div>
          </div>

          {/* judul + deskripsi — animasi masuk CSS sekali per pergantian */}
          <div key={slide} className="mm-rise mt-2">
            <h1 className="text-center text-[22px] font-extrabold leading-[1.15] tracking-tight text-foreground">
              {SLIDES[slide].title}
            </h1>
            <p className="mx-auto mt-2 max-w-[310px] text-center text-[13px] leading-relaxed text-muted-foreground">
              {SLIDES[slide].desc}
            </p>
          </div>

          {/* satu tombol utama lebar penuh */}
          <div className="mt-4 px-5">
            <button
              type="button"
              onClick={next}
              className="press inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105"
            >
              {last ? 'Mulai Sekarang' : 'Lanjut'}
              {!last && (
                <span aria-hidden="true" className="mm-nudge inline-flex">
                  <ArrowRight size={17} strokeWidth={2.5} />
                </span>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
