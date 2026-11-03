'use client'

/**
 * WelcomeView — layar sambutan akun baru (belum ada kendaraan).
 * Perkenalan singkat MotoMate + form kendaraan pertama.
 * Akun baru mulai 100% bersih: tidak ada data demo sama sekali.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bike,
  CircleDollarSign,
  Loader2,
  Route,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const inputCls =
  'min-h-12 w-full rounded-2xl border border-input bg-card px-4 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50'

const FEATURES = [
  {
    icon: Wrench,
    title: 'Pantau komponen motor',
    desc: 'Ketahui kapan oli, busi, atau rem perlu diganti — otomatis dari odometer.',
  },
  {
    icon: Route,
    title: 'Rekam perjalanan GPS',
    desc: 'Jarak & rute perjalanan terekam otomatis lewat GPS HP kamu.',
  },
  {
    icon: CircleDollarSign,
    title: 'Catat pengeluaran',
    desc: 'Bensin, parkir, sampai biaya servis tercatat rapi dalam satu tempat.',
  },
] as const

export function WelcomeView({
  onCreated,
}: {
  /** Dipanggil dengan id kendaraan baru — parent memuat ulang state. */
  onCreated: (vehicleId: string) => Promise<void> | void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('motor')
  const [plate, setPlate] = useState('')
  const [odometer, setOdometer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (name.trim().length < 1) {
      setError('Beri nama motormu dulu ya')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          plate: plate.trim() || undefined,
          odometer: Math.max(0, Math.round(Number(odometer) || 0)),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Gagal menambah kendaraan')
      }
      await onCreated(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah kendaraan')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background px-4 pb-10 pt-8 sm:items-center sm:pb-4 sm:pt-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* Perkenalan */}
        <div className="rounded-[32px] border border-border/60 bg-card p-6 shadow-[0_10px_40px_rgba(16,17,16,0.06)] sm:p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime">
            <Sparkles size={22} className="text-on-lime" strokeWidth={2.2} />
          </span>

          <h1 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
            Selamat Datang di
            <br />
            MotoMate!
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Asisten perawatan motor kamu. Mulai dengan menambahkan kendaraan
            pertama — data milikmu sendiri, bersih tanpa contoh.
          </p>

          <div className="mt-5 space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-foreground">{f.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Form kendaraan pertama */}
        <form
          onSubmit={submit}
          className="mt-4 rounded-[28px] border border-border/60 bg-card p-6"
          noValidate
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime">
              <Bike size={17} className="text-on-lime" />
            </span>
            <h2 className="text-[15px] font-extrabold text-foreground">Kendaraan Pertamamu</h2>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kendaraan, cth. Si Ganteng Ireng"
              autoComplete="off"
              maxLength={40}
              className={inputCls}
              aria-label="Nama kendaraan"
            />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'motor', label: 'Motor' },
                  { value: 'mobil', label: 'Mobil' },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'press min-h-12 rounded-2xl border text-sm font-bold transition-colors',
                    type === t.value
                      ? 'border-lime bg-lime text-on-lime'
                      : 'border-input bg-card text-muted-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="Nomor polisi (opsional)"
              autoComplete="off"
              maxLength={20}
              className={inputCls}
              aria-label="Nomor polisi"
            />
            <input
              type="text"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Kilometer sekarang, cth. 12500"
              autoComplete="off"
              className={inputCls}
              aria-label="Odometer"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-2xl bg-danger/10 px-4 py-2.5 text-[12px] font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="press mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-lime text-[15px] font-extrabold text-on-lime transition-[filter] hover:brightness-105 disabled:opacity-60"
          >
            {saving && <Loader2 size={17} className="animate-spin" />}
            {saving ? 'Menyiapkan…' : 'Mulai Pakai MotoMate'}
          </button>
          <p className="mt-3 text-center text-[11px] font-semibold text-muted-foreground/70">
            Semua komponen akan dipasangkan otomatis sesuai jenis kendaraan
          </p>
        </form>
      </motion.div>
    </div>
  )
}
