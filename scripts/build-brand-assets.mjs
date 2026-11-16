/**
 * build-brand-assets.mjs — merender logo MotoMate (simbol motor tampak depan
 * dalam cincin neon) menjadi seluruh aset PNG yang dibutuhkan platform:
 *  - public/brand/icon-light.svg + icon-dark.svg   (SVG sumber)
 *  - public/images/app-icon-*.png                  (PWA manifest, apple-touch)
 *  - public/images/app-icon-maskable-*.png
 *  - src/app/icon.png + src/app/apple-icon.png     (favicon Next.js App Router)
 *  - android res mipmap ic_launcher.png (jika folder android ada)
 *  - android/app/src/main/res/drawable/splash.png
 * Jalankan: node scripts/build-brand-assets.mjs
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------- Palet identitas ----------
export const NEON = '#DFFF00' // lime neon MotoMate
export const FOREST = '#123528' // deep forest green (simbol di light mode)
export const NIGHT = '#0A2018' // hijau sangat gelap (tile dark / splash)
export const WHITE = '#FFFFFF'

// ---------- Geometri final (viewBox 120x120) ----------
export function ringSvg(stroke, sw = 8.4) {
  return `
  <g fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round">
    <path d="M 41.0 18.2 A 45 45 0 0 1 100.8 78.0" />
    <path d="M 79.0 99.8 A 45 45 0 0 1 19.2 40.0" />
  </g>`
}

export function motorSvg(bodyColor) {
  return `
  <g>
    <path d="M 33 26.5 L 28 37" stroke="${bodyColor}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    <path d="M 87 26.5 L 92 37" stroke="${bodyColor}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    <ellipse cx="29" cy="21" rx="10.2" ry="7" fill="${bodyColor}" transform="rotate(-26 29 21)"/>
    <ellipse cx="91" cy="21" rx="10.2" ry="7" fill="${bodyColor}" transform="rotate(26 91 21)"/>
    <path d="M 22.5 36 C 37 43.5 50 46.5 60 46.5 C 70 46.5 83 43.5 97.5 36 C 93 45 83 50.5 72.5 52 C 66 53 54 53 47.5 52 C 37 50.5 27 45 22.5 36 Z" fill="${bodyColor}"/>
    <path d="M 42 51.5 C 47 50.5 53.5 50.8 57 53.2 C 58.8 54.5 61.2 54.5 63 53.2 C 66.5 50.8 73 50.5 78 51.5 C 76.5 63 72 73.5 67.5 78 C 64.6 80.8 55.4 80.8 52.5 78 C 48 73.5 43.5 63 42 51.5 Z" fill="${bodyColor}"/>
    <rect x="52" y="80.5" width="16" height="23" rx="8" fill="${bodyColor}"/>
  </g>`
}

export function vAccentSvg(stroke = NEON) {
  return `<path d="M 51 59 L 60 68.5 L 69 59" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** Tile ikon penuh: latar + cincin + simbol. bg bisa 'transparent'. */
export function tileIconSvg({ bg, body, ring = NEON, radius = 26 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  ${bg && bg !== 'transparent' ? `<rect width="120" height="120" rx="${radius}" fill="${bg}"/>` : ''}
  ${ringSvg(ring)}
  ${motorSvg(body)}
  ${vAccentSvg()}
</svg>`
}

/** Maskable / foreground adaptive: simbol menyusut ke safe-zone. */
export function maskableIconSvg({ bg, body, ring = NEON, accent = NEON, padRatio = 0.09 }) {
  const pad = 120 * padRatio
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  ${bg && bg !== 'transparent' ? `<rect width="120" height="120" fill="${bg}"/>` : ''}
  <g transform="translate(${pad} ${pad}) scale(${(120 - pad * 2) / 120})">
    ${ringSvg(ring)}
    ${motorSvg(body)}
    ${vAccentSvg(accent)}
  </g>
</svg>`
}

/** Splash Android: latar putih + simbol hijau hutan + wordmark (aset instalasi selalu Light Mode). */
export function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="${WHITE}"/>
  <g transform="translate(22 12) scale(0.64)">
    ${ringSvg(NEON)}
    ${motorSvg(FOREST)}
    ${vAccentSvg()}
  </g>
  <text x="60" y="104" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-weight="800" font-size="11.5" fill="${FOREST}">MotoMate</text>
</svg>`
}

async function renderPng(svg, out, size) {
  await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(out)
  console.log('  ✓', out.replace(ROOT + '/', ''), `${size}px`)
}

async function main() {
  const lightTile = (radius = 26) => tileIconSvg({ bg: WHITE, body: FOREST, radius })
  // Varian dark TIDAK dipakai untuk aset instalasi (ikon/splash) sesuai
  // ketentuan — hanya untuk tampilan di dalam aplikasi via LogoMark (CSS).

  // SVG sumber
  const brandDir = join(ROOT, 'public/brand')
  mkdirSync(brandDir, { recursive: true })
  writeFileSync(join(brandDir, 'icon-light.svg'), lightTile())
  writeFileSync(join(brandDir, 'icon-dark.svg'), tileIconSvg({ bg: NIGHT, body: WHITE }))
  // Mark transparan (simbol saja, tanpa tile) — dipakai web bila perlu
  writeFileSync(
    join(brandDir, 'mark-light.svg'),
    tileIconSvg({ bg: 'transparent', body: FOREST })
  )
  writeFileSync(join(brandDir, 'mark-dark.svg'), tileIconSvg({ bg: 'transparent', body: WHITE }))
  console.log('Menulis SVG sumber…')

  // Ikon aplikasi web/PWA
  console.log('Merender ikon aplikasi…')
  const imgDir = join(ROOT, 'public/images')
  mkdirSync(imgDir, { recursive: true })
  for (const s of [1024, 512, 192, 180, 48, 32]) {
    await renderPng(lightTile(), join(imgDir, `app-icon-${s}.png`), s)
  }
  for (const s of [1024, 512, 192]) {
    await renderPng(
      // ATURAN INSTALASI: ikon PWA maskable SELALU Light Mode
      // (latar putih penuh, simbol hijau hutan, cincin neon) — jangan dark.
      maskableIconSvg({ bg: WHITE, body: FOREST }),
      join(imgDir, `app-icon-maskable-${s}.png`),
      s
    )
  }

  // Favicon Next.js (app router)
  await renderPng(lightTile(), join(ROOT, 'src/app/icon.png'), 256)
  await renderPng(lightTile(), join(ROOT, 'src/app/apple-icon.png'), 180)

  // Aset Android (jika folder android sudah ada)
  const res = join(ROOT, 'android/app/src/main/res')
  if (existsSync(res)) {
    console.log('Merender ikon Android…')
    const mip = {
      'mipmap-mdpi': 48,
      'mipmap-hdpi': 72,
      'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144,
      'mipmap-xxxhdpi': 192,
    }
    for (const [dir, s] of Object.entries(mip)) {
      mkdirSync(join(res, dir), { recursive: true })
      // ATURAN INSTALASI: launcher icon SELALU Light Mode — latar putih,
      // simbol hijau hutan, cincin neon. Dark Mode TIDAK boleh dipakai
      // sebagai ikon instalasi walau tema aplikasi gelap.
      await renderPng(lightTile(s * 0.225), join(res, dir, 'ic_launcher.png'), s)
      await renderPng(lightTile(s / 2), join(res, dir, 'ic_launcher_round.png'), s)
      // Foreground adaptive: simbol di atas latar putih (ic_launcher_background
      // = #FFFFFF). Simbol menyusut ke safe-zone mask (padRatio 0.19) agar
      // TIDAK tertutup lingkaran mask Android — tanpa tile bersudut di dalam.
      await renderPng(
        maskableIconSvg({ bg: 'transparent', body: FOREST, padRatio: 0.19 }),
        join(res, dir, 'ic_launcher_foreground.png'),
        s
      )
    }
    // Monochrome (Android 13+ themed icon): bentuk satu warna + alpha,
    // sistem yang mewarnai. Ukuran canvas 108dp → 432px @xxxhdpi.
    mkdirSync(join(res, 'drawable-xxxhdpi'), { recursive: true })
    await renderPng(
      maskableIconSvg({ bg: 'transparent', body: WHITE, ring: WHITE, accent: WHITE, padRatio: 0.19 }),
      join(res, 'drawable-xxxhdpi/ic_launcher_monochrome.png'),
      432
    )
    mkdirSync(join(res, 'drawable'), { recursive: true })
    await renderPng(splashSvg(), join(res, 'drawable/splash.png'), 1024)
    // Splash di semua bucket density port/land juga SELALU Light Mode —
    // template Capacitor membuat beberapa salinan; jangan biarkan yang lama.
    for (const dir of ['drawable-port-mdpi', 'drawable-port-hdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi', 'drawable-land-mdpi', 'drawable-land-hdpi', 'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi']) {
      mkdirSync(join(res, dir), { recursive: true })
      await renderPng(splashSvg(), join(res, `${dir}/splash.png`), 1024)
    }
  } else {
    console.log('Folder android belum ada — lewati aset launcher/splash.')
  }

  console.log('Selesai.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
