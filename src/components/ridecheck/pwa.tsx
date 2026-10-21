'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Daftarkan service worker (sekali per load) — hanya di production.
 *  Di development SW mem-cache chunk Next.js tanpa hash sehingga kode
 *  lama terus disajikan meski sudah hot-reload. Produksi memakai chunk
 *  ber-hash, jadi cache-first tetap aman di sana. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW gagal — aplikasi tetap jalan normal */
      })
    }
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}

/**
 * Tombol "Instal Aplikasi" — muncul saat browser mengizinkan instalasi PWA.
 * Di Android Chrome: memasang ikon aplikasi ke layar utama (seperti APK).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const installed =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari
        (navigator as unknown as { standalone?: boolean }).standalone === true)
    if (installed) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setHidden(false)
    }
    const onInstalled = () => setHidden(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden || !deferred) return null

  return (
    <div className="absolute inset-x-4 bottom-24 z-[45] flex items-center gap-2.5 rounded-2xl bg-zinc-900 p-3 text-white shadow-xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500">
        <Download size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-tight">Pasang RideCheck di HP-mu</p>
        <p className="text-[11px] text-zinc-300">Buka layar penuh seperti aplikasi asli</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt()
          setDeferred(null)
          setHidden(true)
        }}
        className="shrink-0 rounded-full bg-sky-500 px-3.5 py-2 text-xs font-bold active:scale-95"
      >
        Instal
      </button>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Tutup"
        className="shrink-0 rounded-full bg-white/10 p-1.5 text-zinc-300"
      >
        <X size={13} />
      </button>
    </div>
  )
}
