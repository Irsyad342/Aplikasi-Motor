'use client'

/**
 * Screen Wake Lock — menjaga layar tetap menyala selama perjalanan direkam.
 * Tanpa ini, saat layar ponsel mati browser membekukan halaman sehingga
 * watchPosition berhenti dan jarak/km tidak tercatat (keluhan pengguna).
 * Mendukung Chrome/Edge/Android; Safari/iOS belum mendukung — aplikasi tetap
 * berjalan normal tanpa fitur ini.
 */

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Minta layar tetap menyala. Return null bila tidak didukung / halaman
 * tidak visible / pengguna menolak. Panggil ulang saat halaman kembali
 * visible (lock otomatis dilepas saat tab disembunyikan).
 */
export async function requestScreenLock(): Promise<WakeLockSentinel | null> {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return null
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return null
  try {
    return await navigator.wakeLock.request('screen')
  } catch {
    // Gagal bila layar sudah mati / baterai hemat aktif — bukan masalah fatal
    return null
  }
}

export function releaseScreenLock(lock: WakeLockSentinel | null): void {
  try {
    void lock?.release().catch(() => {})
  } catch {
    /* sudah dilepas — abaikan */
  }
}
