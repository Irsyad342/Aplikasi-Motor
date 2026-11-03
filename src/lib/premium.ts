export interface PremiumPerk {
  id: string
  label: string
  desc: string
}

export const PREMIUM_PERKS: PremiumPerk[] = [
  { id: 'auto-track', label: 'Lacak Otomatis', desc: 'Rekam perjalanan tanpa membuka aplikasi' },
  { id: 'live-map', label: 'Peta Live + Posisi Motor', desc: 'Pantau posisi motor secara real-time di peta' },
  { id: 'unlimited', label: 'Kendaraan Tanpa Batas', desc: 'Tambahkan sebanyak apa pun kendaraanmu' },
  { id: 'bengkel-nasional', label: 'Bengkel Se-Indonesia', desc: 'Cari bengkel terdekat di seluruh daerah' },
  { id: 'export', label: 'Ekspor Riwayat Servis', desc: 'Unduh riwayat perawatan dalam format CSV' },
  { id: 'reminder', label: 'Pengingat Otomatis', desc: 'Notifikasi saat komponen mendekati batas pakai' },
]

export const PREMIUM_STORAGE_KEY = 'rc-premium'

/** Di aplikasi ini premium sudah aktif (unlocked) secara default */
export function readPremiumFlag(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(PREMIUM_STORAGE_KEY) !== '0'
}

export function writePremiumFlag(active: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREMIUM_STORAGE_KEY, active ? '1' : '0')
}

export const PREMIUM_MEMBER_SINCE = 'Oktober 2025'
