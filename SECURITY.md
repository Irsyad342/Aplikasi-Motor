# Kebijakan Keamanan (Security Policy)

## Melaporkan Kerentanan

Jika Anda menemukan kerentanan keamanan, **jangan buat issue publik**.
Laporkan langsung ke pemilik repositori melalui kontak pribadi
(email: irsyadpasha@gmail.com) beserta langkah reproduksi.

## Ringkasan Postur Keamanan

| Area | Perlindungan |
| --- | --- |
| Kredensial | Semua secret (DATABASE_URL, DIRECT_URL, API key) disimpan sebagai environment variable — **tidak pernah** di-commit ke repositori |
| Database | PostgreSQL (Supabase) — akses hanya melalui Prisma Client dengan kredensial pooler; **RLS aktif** di semua tabel + `REVOKE ALL` untuk role `anon`/`authenticated` (deny-by-default terhadap akses REST langsung) |
| SQL Injection | 100% query via Prisma ORM (parameterized statements) — tidak ada raw SQL dari input pengguna |
| API | Rate limiting per-IP di semua endpoint (read/write/sensitive), validasi & sanitasi input (koersi tipe, batas panjang, batas nilai) |
| Transport | TLS wajib (HTTPS Vercel + SSL Supabase pooler), HSTS, kebijakan `Referrer-Policy` |
| Header Keamanan | CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Permissions-Policy, HSTS (lihat `next.config.ts`) |
| Error Handling | Pesan error generik ke klien; detail error hanya di log server |
| DoS | Batas ukuran payload (path perjalanan ≤ 500 KB), batas panjang string, rate limit, connection pool terbatas (`connection_limit=1`) |

## Batasan yang Diketahui

- **Tanpa autentikasi pengguna**: aplikasi ini adalah aplikasi pribadi/demo; siapa pun yang memegang URL dapat mengubah data. Jika akan dibagikan publik, tambahkan autentikasi (mis. NextAuth/Clerk) sebelum rilis.
- **Rate limiter in-memory**: bersifat per-instance di lingkungan serverless (best-effort). Untuk pembatasan global yang ketat gunakan Upstash Redis atau Vercel WAF.
- Rotasi kredensial secara berkala, terutama jika pernah terungkap di percakapan/publik.
