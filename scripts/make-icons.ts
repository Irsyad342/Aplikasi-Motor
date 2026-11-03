/* Proses ikon PWA + hero images untuk RideCheck (jalankan: bun scripts/make-icons.ts) */
import sharp from 'sharp'
import fs from 'fs'

const IMG = 'public/images'

async function main() {
  const icon = `${IMG}/app-icon-raw.png`

  // Ikon standard (corners rounded, transparan di luar)
  await sharp(icon).resize(512, 512).png().toFile(`${IMG}/app-icon-512.png`)
  await sharp(icon).resize(192, 192).png().toFile(`${IMG}/app-icon-192.png`)

  // Full-bleed (untuk maskable & apple-touch): latar solid #101110 + ikon 82% di tengah
  const inner = await sharp(icon).resize(840, 840).png().toBuffer()
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 16, g: 17, b: 16, alpha: 1 } },
  })
    .composite([{ input: inner, top: 92, left: 92 }])
    .png()
    .toFile(`${IMG}/app-icon-fullbleed-1024.png`)
  await sharp(`${IMG}/app-icon-fullbleed-1024.png`).resize(512, 512).png().toFile(`${IMG}/app-icon-maskable-512.png`)
  await sharp(`${IMG}/app-icon-fullbleed-1024.png`).resize(180, 180).png().toFile(`${IMG}/app-icon-180.png`)

  // Hero images final
  fs.copyFileSync(`${IMG}/motor-hero-light-raw.png`, `${IMG}/motor-hero-light.png`)
  fs.copyFileSync(`${IMG}/motor-hero-dark-raw.png`, `${IMG}/motor-hero-dark.png`)
  // Optimasi: width 1152 sudah pas; kompres ulang
  await sharp(`${IMG}/motor-hero-light.png`).resize({ width: 1152 }).webp({ quality: 88 }).toFile(`${IMG}/motor-hero-light.webp`)
  await sharp(`${IMG}/motor-hero-dark.png`).resize({ width: 1152 }).webp({ quality: 88 }).toFile(`${IMG}/motor-hero-dark.webp`)

  console.log('OK — ikon & hero selesai dibuat')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
