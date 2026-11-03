'use client'

/**
 * SettingsView — halaman "Pengaturan" (dirender di dalam slide-over oleh parent).
 * Berisi kartu Premium, daftar kendaraan, preferensi (pengingat & tema),
 * reset data demo, dan footer versi.
 */

import { useSyncExternalStore, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bike, Crown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { VehicleDTO } from '@/lib/state'
import { formatKm } from '@/lib/status'
import { Btn, Card, IconBtn, Pill, SectionTitle } from '@/components/rc/ui'
import { cn } from '@/lib/utils'

export interface SettingsViewProps {
  vehicles: VehicleDTO[]
  currentVehicleId: string
  reminder: boolean
  onToggleReminder: () => void
  onAddVehicle: () => void
  onEditVehicle: (v: VehicleDTO) => void
  onDeleteVehicle: (v: VehicleDTO) => void
  onResetData: () => void
  onBack: () => void
}

const THEMES = [
  { value: 'light', label: 'Terang' },
  { value: 'system', label: 'Sistem' },
  { value: 'dark', label: 'Gelap' },
] as const

// Guard hydrasi tanpa effect: false saat SSR/hydrasi, true setelahnya di klien
const emptySubscribe = () => () => {}
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SettingsView({
  vehicles,
  currentVehicleId,
  reminder,
  onToggleReminder,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onResetData,
  onBack,
}: SettingsViewProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-6 px-5 pb-10 pt-6">
      {/* Header */}
      <FadeUp>
        <div className="flex items-center gap-3">
          <IconBtn label="Kembali" tone="card" onClick={onBack}>
            <ArrowLeft size={20} />
          </IconBtn>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Pengaturan</h1>
        </div>
      </FadeUp>

      {/* Premium */}
      <FadeUp delay={0.04}>
        <Card className="rounded-[28px] bg-lime text-on-lime">
          <div className="flex items-center gap-2.5">
            <Crown size={22} />
            <h2 className="text-lg font-extrabold tracking-tight">MotoMate Premium</h2>
            <Pill tone="dark" className="ml-auto">
              Aktif
            </Pill>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold opacity-80">
            Semua fitur terbuka · Member sejak Oktober 2025
          </p>
        </Card>
      </FadeUp>

      {/* Kendaraan */}
      <FadeUp delay={0.08}>
        <section>
          <SectionTitle title="Kendaraan" />
          <div className="space-y-2.5">
            {vehicles.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bike size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-extrabold text-foreground">{v.name}</p>
                      {v.id === currentVehicleId && <Pill tone="lime">Aktif</Pill>}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {v.type} · {formatKm(v.odometer)} km
                    </p>
                  </div>
                  <IconBtn
                    label={`Ubah ${v.name}`}
                    tone="ghost"
                    className="h-9 w-9"
                    onClick={() => onEditVehicle(v)}
                  >
                    <Pencil size={16} />
                  </IconBtn>
                  <IconBtn
                    label={`Hapus ${v.name}`}
                    tone="ghost"
                    className="h-9 w-9 hover:text-danger"
                    onClick={() => {
                      if (window.confirm(`Hapus ${v.name}?`)) onDeleteVehicle(v)
                    }}
                  >
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              </Card>
            ))}
            <Btn variant="outline" full onClick={onAddVehicle}>
              <Plus size={16} /> Tambah Kendaraan
            </Btn>
          </div>
        </section>
      </FadeUp>

      {/* Preferensi */}
      <FadeUp delay={0.12}>
        <section>
          <SectionTitle title="Preferensi" />
          <Card>
            {/* Pengingat otomatis */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-foreground">Pengingat Otomatis</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Notifikasi saat komponen mendekati batas pakai
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reminder}
                aria-label="Pengingat Otomatis"
                onClick={onToggleReminder}
                className={cn(
                  'press relative h-7 w-12 shrink-0 rounded-full transition-colors',
                  reminder ? 'bg-lime' : 'bg-border'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-ink shadow-sm transition-transform',
                    reminder && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            {/* Tema tampilan */}
            <div className="flex items-center justify-between gap-3 py-3.5 last:border-0">
              <p className="text-[14px] font-extrabold text-foreground">Tema Tampilan</p>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
                {mounted
                  ? THEMES.map((t) => {
                      const active = theme === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setTheme(t.value)}
                          className={cn(
                            'press rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
                            active ? 'bg-ink text-background' : 'text-muted-foreground'
                          )}
                        >
                          {t.label}
                        </button>
                      )
                    })
                  : THEMES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        disabled
                        className="rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground/50"
                      >
                        {t.label}
                      </button>
                    ))}
              </div>
            </div>
          </Card>
        </section>
      </FadeUp>

      {/* Data */}
      <FadeUp delay={0.16}>
        <section>
          <SectionTitle title="Data" />
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-foreground">Atur Ulang Data Demo</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Kembalikan ke data contoh awal
                </p>
              </div>
              <Btn
                variant="danger"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  if (window.confirm('Atur ulang semua data ke demo awal?')) onResetData()
                }}
              >
                Reset
              </Btn>
            </div>
          </Card>
        </section>
      </FadeUp>

      {/* Footer */}
      <FadeUp delay={0.2}>
        <p className="text-center text-[11px] text-muted-foreground">
          MotoMate v2.0 · Dibuat untuk pengendara Indonesia
        </p>
      </FadeUp>
    </div>
  )
}
