'use client'

/**
 * VehicleView — tab "Kendaraan Saya".
 * Hero profil kendaraan (foto light/dark), odometer, daftar kendaraan lain,
 * ringkasan informasi, dan 5 servis terakhir.
 */

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Bike, Car, Gauge, Pencil, Plus, Wrench } from 'lucide-react'
import type { ComponentDTO, RecordDTO, TripDTO, VehicleDTO } from '@/lib/state'
import { formatDate, formatKm, formatKm1 } from '@/lib/status'
import { Btn, Card, EmptyState, Pill, SectionTitle, formatRupiah } from '@/components/rc/ui'
import { ComponentIcon } from '@/components/ridecheck/icons'

export interface VehicleViewProps {
  vehicle: VehicleDTO
  vehicles: VehicleDTO[]
  components: ComponentDTO[]
  records: RecordDTO[]
  trips: TripDTO[]
  heroLight: string
  heroDark: string
  onEditOdometer: () => void
  onEditVehicle: () => void
  onAddVehicle: () => void
  onSwitchVehicle: (id: string) => void
  onOpenDetail: (id: string) => void
  onOpenHistory: () => void
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

export function VehicleView({
  vehicle,
  vehicles,
  components,
  records,
  trips,
  heroLight,
  heroDark,
  onEditOdometer,
  onEditVehicle,
  onAddVehicle,
  onSwitchVehicle,
  onOpenDetail,
  onOpenHistory,
}: VehicleViewProps) {
  const otherVehicles = vehicles.filter((v) => v.id !== vehicle.id)
  const installedCount = components.filter((c) => c.installed).length
  const totalKm = trips.reduce((acc, t) => acc + t.distance, 0)
  const lastRecords = [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const info: Array<[string, string]> = [
    ['Jenis', vehicle.type],
    ['Nomor Polisi', vehicle.plate ?? '—'],
    ['Komponen Dipantau', String(installedCount)],
    ['Total Servis', String(records.length)],
    ['Total Perjalanan', String(trips.length)],
    ['Total Jarak', `${formatKm1(totalKm)} km`],
  ]

  return (
    <div className="space-y-6 pb-4">
      {/* Judul */}
      <FadeUp>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Kendaraan Saya</h1>
      </FadeUp>

      {/* Hero profil */}
      <FadeUp delay={0.04}>
        <Card padded={false} className="overflow-hidden rounded-[28px]">
          <img
            src={heroLight}
            alt={vehicle.name}
            className="dark:hidden max-h-52 w-full object-contain"
          />
          <img
            src={heroDark}
            alt={vehicle.name}
            className="hidden max-h-52 w-full object-contain dark:block"
          />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                {vehicle.name}
              </h2>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Pill tone="gray">
                {vehicle.type.toLowerCase().includes('mobil') ? (
                  <Car size={12} />
                ) : (
                  <Bike size={12} />
                )}
                {vehicle.type}
              </Pill>
              {vehicle.plate && <Pill tone="outline">{vehicle.plate}</Pill>}
            </div>

            <div className="mt-4">
              <div className="stat-num text-3xl leading-none text-foreground">
                {formatKm(vehicle.odometer)}
                <span className="ml-1 text-base font-bold text-muted-foreground">km</span>
              </div>
              <div className="mt-1.5 text-[12px] font-semibold text-muted-foreground">Odometer</div>
            </div>

            <div className="mt-4 flex gap-2.5">
              <Btn variant="lime" className="flex-1" onClick={onEditOdometer}>
                <Gauge size={16} /> Update KM
              </Btn>
              <Btn variant="outline" className="flex-1" onClick={onEditVehicle}>
                <Pencil size={16} /> Ubah Data
              </Btn>
            </div>
          </div>
        </Card>
      </FadeUp>

      {/* Kendaraan lain */}
      {otherVehicles.length > 0 && (
        <FadeUp delay={0.08}>
          <section>
            <SectionTitle title="Kendaraan Lain" />
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
              {otherVehicles.map((v) => (
                <Card
                  key={v.id}
                  onClick={() => onSwitchVehicle(v.id)}
                  className="w-36 shrink-0 p-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {v.type.toLowerCase().includes('mobil') ? (
                      <Car size={16} />
                    ) : (
                      <Bike size={16} />
                    )}
                  </span>
                  <p className="mt-2 truncate text-[13px] font-extrabold text-foreground">{v.name}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {formatKm(v.odometer)} km
                  </p>
                </Card>
              ))}
              <Btn
                variant="outline"
                onClick={onAddVehicle}
                className="h-auto w-24 shrink-0 flex-col gap-1 py-4"
                aria-label="Tambah kendaraan"
              >
                <Plus size={16} />
                <span className="text-[12px]">Tambah</span>
              </Btn>
            </div>
          </section>
        </FadeUp>
      )}

      {/* Informasi */}
      <FadeUp delay={0.12}>
        <section>
          <SectionTitle title="Informasi" />
          <Card>
            {info.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0"
              >
                <span className="text-[13px] font-semibold text-muted-foreground">{k}</span>
                <span className="text-right text-[13px] font-extrabold text-foreground">{v}</span>
              </div>
            ))}
          </Card>
        </section>
      </FadeUp>

      {/* Servis terakhir */}
      <FadeUp delay={0.16}>
        <section>
          <SectionTitle title="Servis Terakhir" action="Lihat Semua" onAction={onOpenHistory} />
          {lastRecords.length === 0 ? (
            <EmptyState
              icon={<Wrench size={22} />}
              title="Belum ada riwayat servis"
              desc="Riwayat servis kendaraan Anda akan tampil di sini setelah dicatat."
            />
          ) : (
            <div className="space-y-2.5">
              {lastRecords.map((r) => (
                <Card key={r.id} onClick={() => onOpenDetail(r.componentId)} className="p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ComponentIcon icon={r.componentIcon} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-foreground">
                        {r.componentName}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {r.type === 'ganti' ? 'Diganti' : 'Diservis'} · {formatDate(r.date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-extrabold text-foreground">
                        {formatKm(r.odometer)} km
                      </p>
                      {r.cost != null && (
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Rp {formatRupiah(r.cost)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </FadeUp>

      {/* Tambah kendaraan */}
      <FadeUp delay={0.2}>
        <Btn variant="outline" full onClick={onAddVehicle}>
          <Plus size={16} /> Tambah Kendaraan
        </Btn>
      </FadeUp>
    </div>
  )
}
