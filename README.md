# RideCheck — Pelacak Perawatan Motor 🏍️

Aplikasi mobile (PWA) untuk memantau kondisi komponen motor, mencatat servis, melacak perjalanan, dan menemukan bengkel terdekat di Pulau Jawa.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma · PostgreSQL (Supabase) · Three.js (3D vehicle viewer) · Leaflet · Framer Motion

## ✨ Fitur

- **Dashboard Kendaraan** — odometer, ringkasan kesehatan komponen (Perlu diganti / Periksa Segera / Sehat), viewer 3D motor dengan rotasi 360°
- **Komponen & Perawatan** — interval servis (km/waktu), slider sisa penggunaan, catat penggantian/servis, riwayat per komponen
- **Perjalanan** — pelacak manual & otomatis dengan GPS perangkat, live stats, rute tersimpan di peta
- **Bengkel Pulau Jawa** — pencarian bengkel dari data peta (Overpass/OpenStreetMap), filter jenis (Resmi/Umum), radius 2–50 km, tombol Telepon & Rute
- **Riwayat** — gabungan servis & perjalanan dengan filter
- **PWA** — dapat di-install ke layar utama HP (Add to Home Screen)

## 🚀 Menjalankan Lokal

```bash
# 1. Instal dependensi (otomatis generate Prisma Client)
bun install

# 2. Salin konfigurasi environment dan isi kredensial Supabase Anda
cp .env.example .env

# 3. Push schema ke database
bun run db:push

# 4. Jalankan
bun run dev
```

Buka http://localhost:3000 — data demo (kendaraan "Si Ganteng Ireng" + 15 komponen) akan di-seed otomatis pada request pertama.

## ☁️ Deploy ke Vercel + Supabase

1. **Supabase** — buat project baru di [supabase.com](https://supabase.com), lalu ambil kredensial database di *Project Settings → Database*.

2. **Push schema** — isi `.env` dengan kredensial Supabase Anda, lalu jalankan:

   ```bash
   bun run db:push
   ```

3. **Vercel** — import repository di [vercel.com/new](https://vercel.com/new), lalu set **Environment Variables** berikut:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | `postgresql://postgres.<REF>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | `postgresql://postgres.<REF>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |

   > **Catatan:**
   > - Gunakan **Transaction Pooler (6543)** untuk `DATABASE_URL` karena Vercel berjalan di lingkungan serverless.
   > - Encode karakter khusus pada password ke format URL (contoh: `@` → `%40`).
   > - `DIRECT_URL` dipakai Prisma CLI untuk migrasi; pada runtime hanya `DATABASE_URL` yang dipakai.
   > - Disarankan menyetel **Function Region = Singapore (sin1)** di Project Settings agar dekat dengan Supabase ap-southeast-1.

4. **Deploy** — klik Deploy. `prisma generate` berjalan otomatis lewat `postinstall`, dan seed data demo dijalankan otomatis pada request pertama.

## 🗄️ Struktur Database (Prisma)

| Model | Keterangan |
| --- | --- |
| `Vehicle` | Kendaraan (motor/mobil) + odometer |
| `Component` | Komponen terpasang + interval servis |
| `ServiceRecord` | Riwayat penggantian/servis |
| `Trip` | Perjalanan tercatat (jarak, durasi, rute) |

## 📱 Install sebagai Aplikasi (PWA)

Buka URL deployment di browser HP (Chrome/Safari), lalu pilih **"Add to Home Screen" / "Tambahkan ke layar utama"**.
