# MotoMate Android (Capacitor + Native Foreground Service GPS)

Aplikasi Android MotoMate membungkus seluruh UI web MotoMate (dimuat dari
`https://aplikasi-motor.vercel.app`) dan menambahkan kemampuan yang TIDAK
dimiliki browser: **perekaman perjalanan GPS di latar belakang** lewat
Foreground Service tipe `location` dengan notifikasi persisten.

> Sumber kebenaran arsitektur: backend, autentikasi, database, dan API tetap
> 100% milik aplikasi web Next.js yang sudah ada. Tidak ada backend kedua.

---

## 1. Arsitektur

```
┌────────────────────────────────────────────────────────────┐
│ WebView Android (Capacitor)                                │
│   UI web MotoMate dari server.url (Vercel)                 │
│   window.Capacitor.Plugins.RideTracking  ◄──── bridge      │
└──────────────┬─────────────────────────────────────────────┘
               │ Plugin: start / finish / discard / getStatus
               │ Event  : onTripUpdate / onTripFinished
┌──────────────▼─────────────────────────────────────────────┐
│ RideTrackingPlugin (Java)                                  │
│  • izin lokasi + notifikasi (dialog Android)               │
│  • validasi GPS perangkat                                  │
└──────────────┬─────────────────────────────────────────────┘
┌──────────────▼─────────────────────────────────────────────┐
│ RideForegroundService (Java)                               │
│  • Foreground Service tipe LOCATION + notifikasi persisten │
│    (durasi via kronometer, jarak, tombol Selesai)          │
│  • FusedLocationProviderClient (PRIORITY_HIGH_ACCURACY)    │
│  • Filter GPS: accuracy ≤100 m penuh, ≤300 m adaptif,      │
│    tolak lompatan >150 km/j, re-anchor setelah jeda >10 m  │
│  • TripDb (SQLite): sesi + titik rute + antrean kirim      │
│  • TripSyncer: POST /api/trips + cookie mm_session WebView │
│    idempoten lewat clientRef — TIDAK membuat duplikat      │
│  • Sinkron ulang otomatis saat internet kembali            │
│  • START_STICKY + pulihan sesi dari SQLite                 │
└────────────────────────────────────────────────────────────┘
```

### Alur pengguna

| Aksi | Yang terjadi |
|---|---|
| Tekan **Mulai** | Validasi izin → GPS aktif? → service berjalan + notifikasi muncul → UI live |
| **Layar dikunci** | GPS tetap direkam oleh service; data aman di SQLite |
| **Buka aplikasi lain** | Tracking berlanjut (notifikasi tetap ada) |
| Tekan **Selesai** (app / notifikasi) | Titik terakhir disimpan → jarak & durasi difinalisasi → trip masuk antrean → dikirim ke server (atau menunggu internet) → service berhenti |
| Internet putus | Trip tersimpan lokal; terkirim otomatis saat online; tidak ada duplikat |
| Service dihentikan sistem | Sesi + progres ada di SQLite; aplikasi menawarkan **Lanjutkan/Buang** (tidak pernah restart diam-diam) |
| Buka aplikasi saat merekam | Status dipulihkan dari service (durasi, jarak, fix) |

---

## 2. Prasyarat build (di komputer Anda, bukan di Vercel)

1. **Android Studio** (Koala/2024 ke atas) atau minimal:
   - JDK 17+ (Capacitor 7 menyertakan Java 21 toolchain)
   - Android SDK Platform **35** + Build-Tools 35
2. Perangkat Android fisik untuk pengujian **wajib** (GPS latar belakang
   tidak bisa diuji jujur di emulator/desktop browser).
3. Node/Bun di komputer build.

## 3. Langkah build

```bash
# 0. (sekali) siapkan keystore rilis — JANGAN di-commit
cp android/keystore.properties.example android/keystore.properties
keytool -genkeypair -v -keystore motomate-release.jks \
  -alias motomate -keyalg RSA -keysize 2048 -validity 10000
# isi android/keystore.properties sesuai contoh, simpan .jks di luar repo

# 1. dependensi web (Capacitor core/cli/android + plugin splash)
bun install

# 2. sinkronkan aset & config ke proyek Android
bunx cap sync android

# 3a. APK untuk pengujian
cd android && ./gradlew assembleDebug
#   hasil: app/build/outputs/apk/debug/app-debug.apk

# 3b. Rilis (AAB untuk Play Store / APK ter-sign)
cd android && ./gradlew bundleRelease    # .aab
cd android && ./gradlew assembleRelease  # .apk ter-sign

# 4. pasang di HP untuk uji
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> **Status build (diverifikasi di lingkungan CI sandbox, JDK 21 + SDK 35):**
> `assembleDebug`, `assembleRelease`, dan `bundleRelease` semuanya
> **BUILD SUCCESSFUL**. Artefak hasil verifikasi:
> - `android/app/build/outputs/apk/debug/app-debug.apk` (~7.5 MB)
> - `android/app/build/outputs/apk/release/app-release.apk` (~6.5 MB, tersigning)
> - `android/app/build/outputs/bundle/release/app-release.aab` (~6.1 MB)
>
> **Reproduksibilitas (16 Nov 2026, sandbox segar):** build diulang dari nol
> (install SDK 35 + JDK Temurin 21, `bunx cap sync android`, lalu
> `./gradlew assembleDebug assembleRelease bundleRelease --no-daemon`) dan
> ketiganya kembali **BUILD SUCCESSFUL** — app-debug.apk 7,7 MB,
> app-release.apk 6,7 MB, app-release.aab 6,4 MB. Hasil inspeksi artefak
> di bawah (ikon Light Mode, `ic_launcher_background #FFFFFFFF`,
> monochrome 432px, izin via `aapt2 dump badging`) diverifikasi ulang
> langsung dari APK hasil build ulang.
>
> Ikon launcher di dalam APK telah diperiksa langsung (diekstrak dari APK):
> selalu varian **Light Mode** (tile putih, motor hijau hutan, cincin neon),
> adaptive-icon background `#FFFFFF`, plus `ic_launcher_monochrome` untuk
> themed icon Android 13+. Permission pada APK terverifikasi via
> `aapt2 dump badging`: FINE/COARSE_LOCATION, FOREGROUND_SERVICE(_LOCATION),
> POST_NOTIFICATIONS — tanpa izin berlebih.

## 4. Konfigurasi penting

| Berkas | Isi |
|---|---|
| `capacitor.config.ts` | `appId: id.motomate.app`, `server.url: https://aplikasi-motor.vercel.app` — **ubah di sini** jika pindah domain |
| `TripSyncer.java` | Konstanta `SERVER_URL` — **harus sama** dengan `server.url` agar cookie sesi terbaca |
| `AndroidManifest.xml` | Izin `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`; `<service … foregroundServiceType="location">` |
| `app/build.gradle` | Signing dibaca dari `android/keystore.properties` (di-gitignore) |

## 5. Uji perekaman layar terkunci (WAJIB, perangkat fisik)

1. Pasang APK → login (akun sama dengan web) → tab **Perjalanan** → **Mulai Rekam GPS**.
2. Beri izin lokasi (dialog pertama kali) dan izin notifikasi (Android 13+).
3. Pastikan notifikasi persisten muncul: *MotoMate merekam perjalanan* + durasi berjalan + tombol **Selesai**.
4. **Kunci layar** dan naik motor ± 5 menit.
5. Buka kembali aplikasi → durasi & jarak harus sesuai perjalanan nyata (bukan 0).
6. Ulangi sambil membuka aplikasi lain (mis. Maps) — notifikasi tetap hidup.
7. Mode pesawat 10 menit selama perjalanan → Selesai → buka internet → trip
   muncul di Riwayat tanpa duplikat.
8. Hentikan dari **notifikasi** dan dari **tombol di aplikasi** (keduanya harus berfungsi).
9. Di pengaturan perangkat, paksa berhenti (force-stop) MotoMate di tengah
   rekaman → buka lagi → muncul kartu *Layanan GPS terhenti… Lanjutkan/Buang*.

### Catatan jujur mengenai OEM

Produsen dengan penghemat baterai agresif (Xiaomi/MIUI, Oppo/Realme, Vivo,
Huawei) dapat mematikan Foreground Service lebih cepat dari standar Android.
Untuk hasil paling stabil, pengguna sebaiknya mengecualikan MotoMate dari
"Battery optimization"/"Auto-start". **Ini keterbatasan platform Android, bukan
bug aplikasi** — aplikasi menangani kondisi tersebut dengan pulihan sesi dari
SQLite (tidak ada data hilang diam-diam).

## 6. Keamanan

- `android/keystore.properties`, `*.jks`, `*.keystore` **di-gitignore** —
  jangan pernah push secret signing.
- Cookie sesi (`mm_session`, httpOnly) hanya dibaca di sisi native lewat
  `CookieManager` untuk mengirim trip; tidak pernah diekspos ke JS.
