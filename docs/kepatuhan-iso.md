# Kepatuhan Standar — ISO/IEC 27001 & ISO/IEC 25010

Dokumen ini memetakan penerapan proyek **RideCheck** terhadap dua standar
internasional. Proyek ini **tidak tersertifikasi** — dokumen ini menunjukkan
keselarasan praktik teknis dengan kontrol standar terkait.

---

## 1. ISO/IEC 27001:2022 — Manajemen Keamanan Informasi (Annex A)

| Kontrol | Judul | Implementasi di Proyek Ini |
| --- | --- | --- |
| A.5.15 / A.5.16 | Access control / Identity management | Akses DB hanya via kredensial pooler di environment variable; tidak ada kredensial di kode |
| A.5.23 | Cloud services security | Supabase (TLS wajib, RLS aktif, REVOKE anon/authenticated); Vercel (HTTPS, env terkelola per environment) |
| A.8.2 | Privileged access rights | Role `postgres` tidak pernah terekspos ke klien; role publik (`anon`) tidak punya grant apa pun |
| A.8.5 | Secure authentication | Koneksi DB memakai kredensial kuat via pooler; direkomendasikan rotasi berkala |
| A.8.9 | Configuration management | Konfigurasi via `.env` (tidak di-commit) + `.env.example` sebagai template; config produksi via dashboard Vercel |
| A.8.12 | Data leakage prevention | Scan secret pada repositori bersih (riwayat di-squash); `.env` di `.gitignore`; pesan error generik tanpa detail internal |
| A.8.16 | Monitoring activities | Log error server-side (`console.error` per endpoint); log runtime tersedia di dashboard Vercel |
| A.8.24 | Use of cryptography | Transport terenkripsi end-to-end: HTTPS (HSTS) di sisi web, SSL ke pooler Supabase |
| A.8.25 / A.8.28 | Secure development / Secure coding | TypeScript strict, ESLint bersih, Prisma ORM (anti SQL-injection), validasi & sanitasi input di semua endpoint, rate limiting |
| A.8.26 | Application security requirements | Header keamanan (CSP, X-Frame-Options, nosniff, Permissions-Policy) di `next.config.ts` |
| A.8.29 | Security testing | Verifikasi manual end-to-end (dashboard, CRUD, persistensi, race test 6 request konkuren); lint & type-check |
| A.8.30 | Outsourced development | Dependensi pihak ketiga terkunci lewat `bun.lock`; perubahan direview via git |
| A.8.32 | Change management | Semua perubahan melalui commit git; riwayat bersih 1-commit baseline |

**Kepatuhan data pribadi:** aplikasi hanya memproses data kendaraan & lokasi
perangkat milik pengguna itu sendiri; lokasi GPS dipakai on-device (browser)
untuk pencarian bengkel dan tidak disimpan sebagai identitas.

---

## 2. ISO/IEC 25010:2023 — Kualitas Produk Perangkat Lunak

| Karakteristik | Implementasi |
| --- | --- |
| **Functional suitability** | Fitur lengkap: dashboard komponen, interval servis, catat penggantian, pelacak perjalanan GPS, bengkel Pulau Jawa, riwayat, PWA |
| **Performance efficiency** | Connection pool (`connection_limit=1` + pgbouncer) untuk serverless; seed atomik (advisory lock) menghindari duplikasi kerja; payload dibatasi; query terindeks (`@@index` pada foreign key) |
| **Compatibility** | PWA responsif mobile-first (Tailwind breakpoint), berjalan di Chrome/Safari Android & iOS, tile peta standar OSM |
| **Usability** | UI berbahasa Indonesia, target sentuh ≥ 44px, status komponen berwarna (merah/kuning/hijau), feedback toast untuk setiap aksi |
| **Reliability** | Penanganan error di semua endpoint (try/catch → 4xx/5xx generik), transaksi DB untuk operasi multi-tabel, race-safe seeding, fallback demo saat server peta tidak terjangkau, GPS fallback saat izin ditolak |
| **Security** | Lihat bagian ISO 27001 di atas + `SECURITY.md` (RLS, rate limit, header keamanan, sanitasi input) |
| **Maintainability** | TypeScript strict tanpa `any`, arsitektur terlapis (lib → API → komponen), ESLint, modul kecil terfokus, skema DB terdokumentasi di `prisma/schema.prisma` |
| **Portability** | Deploy ke Vercel (default) maupun self-host (`output: standalone`), DB PostgreSQL standar (mudah pindah provider), konfigurasi via environment variable |

---

## 3. Bukti Implementasi (referensi berkas)

- `next.config.ts` — security headers, nonaktifkan X-Powered-By
- `src/lib/rate-limit.ts` — rate limiter per-IP (read/write/sensitive)
- `src/app/api/**` — validasi input, sanitasi, rate limit, error generik
- `prisma/schema.prisma` — skema + indeks; provider PostgreSQL
- `SECURITY.md` — kebijakan keamanan & batasan yang diketahui
- `.gitignore` + `.env.example` — pengelolaan kredensial
