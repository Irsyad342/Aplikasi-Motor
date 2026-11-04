'use client'

/**
 * IntroView — Welcome Screen & Onboarding MotoMate.
 * Struktur:
 * • ATAS   : brand MotoMate (logo + wordmark) dan tombol Lewati.
 * • TENGAH : ilustrasi besar dari CSS murni (smartphone profil kendaraan,
 *            perawatan, riwayat & biaya, serta pratinjau tema terang/gelap
 *            yang bisa diklik langsung). Empat slide berdiri di sebuah
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
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Bike,
  CalendarDays,
  ChartColumn,
  Check,
  Disc3,
  Droplets,
  Gauge,
  Moon,
  Receipt,
  ShieldCheck,
  Sun,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMounted } from '@/lib/use-mounted'

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
  {
    key: 'tema',
    title: 'Your Style, Your Ride',
    desc: 'Pilih tampilan terang untuk siang hari atau gelap yang nyaman di malam hari. Ketuk pratinjau untuk mencoba.',
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

/* ---------- ILUSTRASI SLIDE 4: pratinjau tema terang & gelap, bisa diklik ---------- */

/** pratinjau mini dengan warna statis — sengaja tidak mengikuti tema
    aplikasi agar perbedaan terang dan gelap selalu terlihat berdampingan */
function MiniPhone({ mode }: { mode: 'light' | 'dark' }) {
  const dark = mode === 'dark'
  const surface = dark ? 'border-white/10 bg-[#262823]' : 'border-[#101110]/10 bg-white'
  const row = dark ? 'bg-[#32342c]' : 'bg-[#ecece7]'
  const text = dark ? 'text-[#f3f3f0]' : 'text-[#101110]'
  const sub = dark ? 'text-[#b8bab2]' : 'text-[#63655f]'
  const ok = dark ? 'text-[#dfff00]' : 'text-[#a4cc0d]'
  const warn = dark ? 'text-[#f5c518]' : 'text-[#e8a317]'

  return (
    <span aria-hidden="true" className={cn('block w-full rounded-[18px] border p-2', surface)}>
      {/* bar aplikasi mini */}
      <span className="flex items-center gap-1 px-0.5 pb-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-[#dfff00]">
          <Bike size={9} className="text-[#101110]" strokeWidth={2.6} />
        </span>
        <span className={cn('text-[7.5px] font-extrabold tracking-tight', text)}>MotoMate</span>
        <span className={cn('ml-auto h-1 w-1 rounded-full', dark ? 'bg-[#dfff00]' : 'bg-[#a4cc0d]')} />
      </span>

      {/* kartu kendaraan mini */}
      <span className="block rounded-[12px] bg-[#dfff00] p-1.5">
        <span className="flex items-center gap-1">
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md bg-[#101110]/10">
            <Bike size={10} className="text-[#101110]" strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[7.5px] font-extrabold leading-tight text-[#101110]">Beat Sto</span>
            <span className="block text-[6px] font-bold uppercase tracking-wider text-[#101110]/60">B 6421 XYZ</span>
          </span>
        </span>
        <span className="mt-1 flex items-end justify-between rounded-[8px] bg-[#101110]/10 px-1.5 py-1">
          <span>
            <span className="block text-[5.5px] font-bold uppercase tracking-wider text-[#101110]/60">Odometer</span>
            <span className="block text-[10px] font-extrabold leading-tight text-[#101110]">12.400 km</span>
          </span>
          <Gauge size={9} className="text-[#101110]/70" />
        </span>
      </span>

      {/* kondisi komponen mini */}
      <span className="mt-1.5 block space-y-1">
        <span className={cn('flex items-center gap-1 rounded-lg px-1.5 py-1', row)}>
          <span className={cn('h-1 w-1 shrink-0 rounded-full', dark ? 'bg-[#dfff00]' : 'bg-[#a4cc0d]')} />
          <span className={cn('text-[7px] font-bold', text)}>Oli mesin</span>
          <span className={cn('ml-auto text-[6.5px] font-extrabold', ok)}>Sehat</span>
        </span>
        <span className={cn('flex items-center gap-1 rounded-lg px-1.5 py-1', row)}>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[#f5c518]" />
          <span className={cn('text-[7px] font-bold', text)}>Rem cakram</span>
          <span className={cn('ml-auto text-[6.5px] font-extrabold', warn)}>Cek 40%</span>
        </span>
      </span>

      {/* kesehatan motor mini */}
      <span className="mt-1.5 block px-0.5 pb-0.5">
        <span className={cn('flex items-center justify-between text-[6px] font-bold', sub)}>
          <span>Kesehatan motor</span>
          <span className={text}>86%</span>
        </span>
        <span className={cn('mt-0.5 block h-1 overflow-hidden rounded-full', row)}>
          <span className="block h-full w-[86%] rounded-full bg-[#dfff00]" />
        </span>
      </span>
    </span>
  )
}

/** pratinjau yang bisa diklik — menerapkan tema lewat next-themes aplikasi */
function ThemePreview({
  mode,
  label,
  icon: Icon,
  tilt,
  selected,
  onSelect,
}: {
  mode: 'light' | 'dark'
  label: string
  icon: LucideIcon
  tilt: string
  selected: boolean
  onSelect: (mode: 'light' | 'dark') => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      aria-pressed={selected}
      aria-label={`Gunakan tema ${label}`}
      className="press flex w-[118px] shrink-0 flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-[132px]"
    >
      <span
        className={cn(
          'relative block w-full rounded-[22px] p-1 ring-2 transition-[box-shadow] duration-300',
          selected ? 'ring-lime ring-offset-2 ring-offset-background' : 'ring-transparent'
        )}
      >
        <span aria-hidden="true" className={cn('block', tilt)}>
          <MiniPhone mode={mode} />
        </span>
        {selected && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-lime shadow-md ring-2 ring-background">
            <Check size={12} className="text-on-lime" strokeWidth={3} />
          </span>
        )}
      </span>
      <span
        className={cn(
          'mt-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors duration-300',
          selected ? 'bg-lime text-on-lime' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon size={11} strokeWidth={2.4} />
        {label}
      </span>
    </button>
  )
}

function IllustrationTheme({
  active,
  theme,
  onSelect,
}: {
  active: boolean
  theme: 'light' | 'dark'
  onSelect: (mode: 'light' | 'dark') => void
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center [@media(max-height:660px)]:scale-90">
      <SoftGlow />
      <span
        aria-hidden="true"
        className={cn('absolute h-[280px] w-[280px] rounded-full border border-dashed border-lime/50', active && 'mm-spin')}
      />
      <span aria-hidden="true" className="absolute h-[340px] w-[340px] rounded-full border border-border/50" />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <ThemePreview
          mode="light"
          label="Terang"
          icon={Sun}
          tilt="-rotate-3 translate-y-1"
          selected={theme === 'light'}
          onSelect={onSelect}
        />
        <ThemePreview
          mode="dark"
          label="Gelap"
          icon={Moon}
          tilt="rotate-3 -translate-y-1"
          selected={theme === 'dark'}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}

/* ---------- komponen utama ---------- */
export function IntroView({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const doneRef = useRef(false)
  const last = slide === SLIDES.length - 1

  /* tema mengikuti sistem next-themes aplikasi — ikon mencerminkan tema aktif */
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === 'dark'
  const previewTheme: 'light' | 'dark' = dark ? 'dark' : 'light'

  /** pilihan tema dari slide pengenalan — langsung disimpan next-themes */
  const applyThemeChoice = useCallback(
    (mode: 'light' | 'dark') => setTheme(mode),
    [setTheme]
  )

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
          <span className="mm-rise flex items-center gap-2">
            {/* saklar tema kecil: matahari = terang, bulan = gelap */}
            <button
              type="button"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              aria-label={dark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              aria-pressed={dark}
              className="press flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
            >
              {dark ? <Moon size={15} strokeWidth={2.2} /> : <Sun size={15} strokeWidth={2.2} />}
            </button>
            <button
              type="button"
              onClick={finish}
              className="press rounded-full bg-muted px-4 py-2 text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              Lewati
            </button>
          </span>
        </header>

        {/* ===== TENGAH: track ilustrasi, digeser dengan transform CSS ===== */}
        <main className="relative flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {SLIDES.map((s, i) => {
              if (s.key === 'tema') {
                return (
                  <section key={s.key} className="h-full w-full shrink-0 px-4 sm:px-6">
                    <IllustrationTheme active={slide === i} theme={previewTheme} onSelect={applyThemeChoice} />
                  </section>
                )
              }
              const Ill = ILLUSTRATIONS[i]
              return (
                <section key={s.key} className="h-full w-full shrink-0 px-4 sm:px-6">
                  <Ill active={slide === i} />
                </section>
              )
            })}
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
