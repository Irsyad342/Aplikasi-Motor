'use client'

/**
 * VehicleView — tab "Kendaraan Saya".
 * Hero profil kendaraan (minimalis tanpa foto, dengan highlight ringkas),
 * daftar kendaraan lain, dan 5 servis terakhir.
 */

import { motion } from 'framer-motion'
import { Bike, Car, Gauge, Pencil, Plus, Wrench } from 'lucide-react'
import type { ComponentDTO, RecordDTO, TripDTO, VehicleDTO } from '@/lib/state'
import { formatDate, formatKm, formatKm1 } from '@/lib/status'
import {
  Btn,
  Card,
  EmptyState,
  HighlightTile,
  Pill,
  SectionTitle,
  formatRupiah,
} from '@/components/rc/ui'
import { ComponentIcon } from '@/components/ridecheck/icons'

export interface VehicleViewProps {
  vehicle: VehicleDTO
  vehicles: VehicleDTO[]
  components: ComponentDTO[]
  records: RecordDTO[]
  trips: TripDTO[]
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
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
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

  return (
    <div className="space-y-6 pb-4">
      {/* Judul */}
      <FadeUp>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Kendaraan Saya</h1>
      </FadeUp>

      {/* Hero profil — minimalis tanpa foto */}
      <FadeUp delay={0.04}>
        <Card className="rounded-[28px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold break-words tracking-tight text-foreground">
                {vehicle.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Pill tone="dark">
                  {vehicle.type.toLowerCase().includes('mobil') ? (
                    <Car size={12} />
                  ) : (
                    <Bike size={12} />
                  )}
                  {vehicle.type === 'motor' ? 'Motor' : 'Mobil'}
                </Pill>
                {vehicle.plate && <Pill tone="outline">{vehicle.plate}</Pill>}
              </div>
            </div>
            <Pill tone="lime" className="mt-1 shrink-0">
              Aktif
            </Pill>
          </div>

          <div className="mt-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Odometer
            </div>
            <div className="stat-num text-3xl leading-tight text-foreground">
              {formatKm(vehicle.odometer)}
              <span className="ml-1 text-base font-bold text-muted-foreground">km</span>
            </div>
          </div>

          {/* Highlight ringkas */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HighlightTile label="Dipantau" value={installedCount} sub="komponen" />
            <HighlightTile label="Servis" value={records.length} sub="total catatan" />
            <HighlightTile
              label="Jarak"
              value={
                <>
                  {formatKm1(totalKm)}
                  <span className="ml-0.5 text-[11px] font-bold text-muted-foreground">km</span>
                </>
              }
              sub="total tempuh"
            />
          </div>

          <div className="mt-4 flex gap-2.5">
            <Btn variant="lime" className="flex-1" onClick={onEditOdometer}>
              <Gauge size={16} /> Update KM
            </Btn>
            <Btn variant="outline" className="flex-1" onClick={onEditVehicle}>
              <Pencil size={16} /> Ubah Data
            </Btn>
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

      {/* Servis terakhir */}
      <FadeUp delay={0.12}>
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
      <FadeUp delay={0.16}>
        <Btn variant="outline" full onClick={onAddVehicle}>
          <Plus size={16} /> Tambah Kendaraan
        </Btn>
      </FadeUp>
    </div>
  )
}
