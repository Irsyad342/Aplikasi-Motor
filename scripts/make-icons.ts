/* Proses ikon PWA MotoMate dari desain "M + stang motor" (jalankan: bun scripts/make-icons.ts)
   Sumber: upload/pasted_image_1793690671251.jpg — kotak putih rounded berisi logo M hitam
   di atas latar krem. Kita crop ke kotak putih lalu hasilkan seluruh ukuran ikon. */
import sharp from 'sharp'
import fs from 'fs'

const IMG = 'public/images'
const SOURCE = 'upload/pasted_image_1793690671251.jpg'

async function main() {
  // 1) Trim latar krem -> bounding box kotak putih
  const trimmed = await sharp(SOURCE)
    .trim({ threshold: 18 })
    .toBuffer()
  const meta = await sharp(trimmed).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w === 0 || h === 0) throw new Error('Gagal mendeteksi kotak ikon')

  // 2) Inset ~4.5% untuk membuang sisa latar krem di sudut rounded,
  //    lalu jadikan master persegi penuh (latar putih bersih + logo M)
  const inset = Math.round(Math.min(w, h) * 0.045)
  const side = Math.min(w, h) - inset * 2
  const masterBuf = await sharp(trimmed)
    .extract({ left: Math.round((w - side) / 2), top: Math.round((h - side) / 2), width: side, height: side })
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toBuffer()

  // 3) Putihkan piksel krem sisa JPEG (r>j b, terang) agar latar benar-benar putih murni
  const { data, info } = await sharp(masterBuf).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 225 && g > 218 && b > 198 && r - b >= 4 && r - b <= 44) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
    }
  }
  const master = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toBuffer()

  fs.writeFileSync(`${IMG}/app-icon-1024.png`, master)

  // 3) Ikon standar (purpose "any") — latar putih penuh, launcher yang membulatkan sudut
  await sharp(master).resize(512, 512).png().toFile(`${IMG}/app-icon-512.png`)
  await sharp(master).resize(192, 192).png().toFile(`${IMG}/app-icon-192.png`)
  await sharp(master).resize(180, 180).png().toFile(`${IMG}/app-icon-180.png`)

  // 4) Maskable: area aman 80% — logo diskalakan ke ~76% di atas kanvas putih penuh
  const safe = await sharp(master).resize(780, 780).png().toBuffer()
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: safe, top: 122, left: 122 }])
    .png()
    .toFile(`${IMG}/app-icon-maskable-1024.png`)
  await sharp(`${IMG}/app-icon-maskable-1024.png`).resize(512, 512).png().toFile(`${IMG}/app-icon-maskable-512.png`)

  // 5) Favicon kecil untuk tab browser (src/app/icon.png otomatis dipakai Next.js)
  await sharp(master).resize(48, 48).png().toFile('src/app/icon.png')

  console.log('OK — ikon MotoMate selesai dibuat')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
