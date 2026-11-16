import { cn } from '@/lib/utils'

/**
 * LogoMark — simbol motor tampak depan dalam cincin neon, identitas visual
 * MotoMate. Adaptif tema otomatis: bodi motor hijau hutan di mode terang,
 * putih di mode gelap; cincin selalu neon lime. `variant` memaksa varian
 * tetap (dipakai pratinjau tema di onboarding).
 */

export interface LogoMarkProps {
  /** Ukuran dalam px (persegi) */
  size?: number
  className?: string
  /** Tampilkan tile latar bulat seperti ikon aplikasi (default true) */
  tile?: boolean
  /** auto = ikut tema; light/dark = varian tetap */
  variant?: 'auto' | 'light' | 'dark'
  /** Label aksesibilitas; kosong = dekoratif (aria-hidden) */
  label?: string
}

export function LogoMark({
  size = 36,
  className,
  tile = true,
  variant = 'auto',
  label,
}: LogoMarkProps) {
  const bodyCls =
    variant === 'light' ? 'mm-logo-body-light' : variant === 'dark' ? 'mm-logo-body-dark' : 'mm-logo-body'
  const strokeCls =
    variant === 'light' ? 'mm-logo-stroke-light' : variant === 'dark' ? 'mm-logo-stroke-dark' : 'mm-logo-stroke'
  const tileCls =
    variant === 'light' ? 'mm-logo-tile-light' : variant === 'dark' ? 'mm-logo-tile-dark' : 'mm-logo-tile'
  const aria = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const)
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      {...aria}
    >
      {tile && <rect width="120" height="120" rx="26" className={tileCls} />}
      <g fill="none" className="mm-logo-ring" strokeWidth={8.4} strokeLinecap="round">
        <path d="M 41.0 18.2 A 45 45 0 0 1 100.8 78.0" />
        <path d="M 79.0 99.8 A 45 45 0 0 1 19.2 40.0" />
      </g>
      <g className={bodyCls}>
        <path className={strokeCls} d="M 33 26.5 L 28 37" strokeWidth={5.5} strokeLinecap="round" fill="none" />
        <path className={strokeCls} d="M 87 26.5 L 92 37" strokeWidth={5.5} strokeLinecap="round" fill="none" />
        <ellipse cx="29" cy="21" rx="10.2" ry="7" transform="rotate(-26 29 21)" />
        <ellipse cx="91" cy="21" rx="10.2" ry="7" transform="rotate(26 91 21)" />
        <path d="M 22.5 36 C 37 43.5 50 46.5 60 46.5 C 70 46.5 83 43.5 97.5 36 C 93 45 83 50.5 72.5 52 C 66 53 54 53 47.5 52 C 37 50.5 27 45 22.5 36 Z" />
        <path d="M 42 51.5 C 47 50.5 53.5 50.8 57 53.2 C 58.8 54.5 61.2 54.5 63 53.2 C 66.5 50.8 73 50.5 78 51.5 C 76.5 63 72 73.5 67.5 78 C 64.6 80.8 55.4 80.8 52.5 78 C 48 73.5 43.5 63 42 51.5 Z" />
        <rect x="52" y="80.5" width="16" height="23" rx="8" />
      </g>
      <path
        d="M 51 59 L 60 68.5 L 69 59"
        fill="none"
        className="mm-logo-ring"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * LogoFull — simbol + wordmark MotoMate. Dipakai di area branding
 * (welcome screen, baris brand auth). Wordmark mengikuti warna teks tema.
 */
export function LogoFull({
  markSize = 36,
  className,
  markClassName,
  textClassName,
  variant = 'auto',
}: {
  markSize?: number
  className?: string
  markClassName?: string
  textClassName?: string
  variant?: 'auto' | 'light' | 'dark'
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={markSize} className={markClassName} variant={variant} />
      <span
        className={cn(
          'font-extrabold tracking-tight text-foreground',
          textClassName
        )}
      >
        MotoMate
      </span>
    </span>
  )
}
