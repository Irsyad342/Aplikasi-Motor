'use client'

import { useState } from 'react'
import { Trash2, Pencil, RotateCcw, Bike, CarFront } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatKm } from '@/lib/status'
import type { VehicleDTO } from '@/lib/state'
import { BottomSheet } from './ui-bits'

// ---------- Dialog Tambah Kendaraan ----------
export function AddVehicleDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; type: string; odometer: number }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'motor' | 'mobil'>('motor')
  const [odometer, setOdometer] = useState('0')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({ name, type, odometer: Math.max(0, Math.round(Number(odometer) || 0)) })
      setName('')
      setOdometer('0')
      setType('motor')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[360px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Tambah Kendaraan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="veh-name">
              Nama Kendaraan
            </label>
            <input
              id="veh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Si Ganteng Ireng"
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold text-zinc-500">Tipe</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: 'motor', label: 'Motor', icon: Bike },
                  { v: 'mobil', label: 'Mobil', icon: CarFront },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold transition-colors',
                    type === t.v
                      ? 'border-sky-500 bg-sky-50 text-sky-600'
                      : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                  )}
                >
                  <t.icon size={18} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="veh-odo">
              Odometer Awal (km)
            </label>
            <input
              id="veh-odo"
              type="number"
              inputMode="numeric"
              min={0}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={handleSave}
            className="w-full rounded-full bg-sky-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Menyimpan…' : 'Simpan Kendaraan'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog Edit Odometer ----------
export function OdometerDialog({
  open,
  onClose,
  vehicle,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  vehicle: VehicleDTO | null
  onSubmit: (odometer: number) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [openState, setOpenState] = useState(false)

  // sinkronkan nilai saat dialog dibuka
  if (open && !openState) {
    setOpenState(true)
    setValue(String(vehicle?.odometer ?? 0))
  }
  if (!open && openState) setOpenState(false)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[340px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Ubah Odometer</DialogTitle>
        </DialogHeader>
        <div className="pt-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-center text-xl font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-sky-400"
              aria-label="Odometer dalam km"
            />
            <span className="text-base font-semibold text-zinc-400">km</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await onSubmit(Math.max(0, Math.round(Number(value) || 0)))
              onClose()
            }}
            className="mt-4 w-full rounded-full bg-sky-500 py-3.5 text-sm font-bold text-white active:scale-[0.98]"
          >
            Simpan
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog Catat Penggantian ----------
export function ServiceDialog({
  open,
  onClose,
  componentName,
  currentOdometer,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  componentName: string
  currentOdometer: number
  onSubmit: (data: { type: string; odometer: number; date: string; note: string }) => Promise<void>
}) {
  const [type, setType] = useState<'ganti' | 'servis'>('ganti')
  const [odometer, setOdometer] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [openState, setOpenState] = useState(false)
  const [saving, setSaving] = useState(false)

  if (open && !openState) {
    setOpenState(true)
    setOdometer(String(currentOdometer))
    setDate(new Date().toISOString().slice(0, 10))
    setNote('')
    setType('ganti')
  }
  if (!open && openState) setOpenState(false)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[360px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Catat {type === 'ganti' ? 'Penggantian' : 'Servis'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: 'ganti', label: 'Diganti' },
                { v: 'servis', label: 'Servis' },
              ] as const
            ).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setType(t.v)}
                className={cn(
                  'rounded-2xl border-2 py-2.5 text-sm font-bold transition-colors',
                  type === t.v
                    ? 'border-sky-500 bg-sky-50 text-sky-600'
                    : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="svc-odo">
                Odometer (km)
              </label>
              <input
                id="svc-odo"
                type="number"
                inputMode="numeric"
                min={0}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full rounded-2xl bg-zinc-100 px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="svc-date">
                Tanggal
              </label>
              <input
                id="svc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl bg-zinc-100 px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="svc-note">
              Catatan (opsional)
            </label>
            <textarea
              id="svc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="cth. Menggunakan oli Castrol 10W-40"
              className="w-full resize-none rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSubmit({
                  type,
                  odometer: Math.max(0, Math.round(Number(odometer) || 0)),
                  date,
                  note,
                })
                onClose()
              } finally {
                setSaving(false)
              }
            }}
            className="w-full rounded-full bg-sky-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Menyimpan…' : `Simpan untuk ${componentName}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Sheet Pengaturan ----------
export function SettingsSheet({
  open,
  onClose,
  vehicles,
  currentVehicleId,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onResetData,
}: {
  open: boolean
  onClose: () => void
  vehicles: VehicleDTO[]
  currentVehicleId: string
  onAddVehicle: () => void
  onEditVehicle: (v: VehicleDTO) => void
  onDeleteVehicle: (v: VehicleDTO) => void
  onResetData: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Pengaturan">
      <div className="px-5 pb-2">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
          Kendaraan
        </h4>
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-3.5',
                v.id === currentVehicleId ? 'border-sky-200 bg-sky-50/60' : 'border-zinc-100'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  v.id === currentVehicleId ? 'bg-sky-100 text-sky-600' : 'bg-zinc-100 text-zinc-500'
                )}
              >
                {v.type === 'mobil' ? <CarFront size={18} /> : <Bike size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-800">{v.name}</p>
                <p className="text-xs text-zinc-400">{formatKm(v.odometer)} km</p>
              </div>
              <button
                type="button"
                onClick={() => onEditVehicle(v)}
                aria-label={`Ubah ${v.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 active:scale-95"
              >
                <Pencil size={14} />
              </button>
              {vehicles.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteVehicle(v)}
                  aria-label={`Hapus ${v.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 active:scale-95"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddVehicle}
          className="mt-3 w-full rounded-2xl border border-dashed border-zinc-300 py-3 text-sm font-bold text-zinc-500 active:scale-[0.99]"
        >
          + Tambah Kendaraan
        </button>

        <h4 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-zinc-400">
          Data
        </h4>
        <button
          type="button"
          onClick={onResetData}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-100 py-3 text-sm font-bold text-zinc-600 active:scale-[0.99]"
        >
          <RotateCcw size={15} />
          Atur Ulang Data Demo
        </button>

        <p className="mt-6 text-center text-xs text-zinc-400">
          RideCheck Clone · Dibuat dengan Z.ai
        </p>
      </div>
    </BottomSheet>
  )
}

// ---------- Dialog Ubah Kendaraan (nama + odo) ----------
export function EditVehicleDialog({
  vehicle,
  onClose,
  onSubmit,
}: {
  vehicle: VehicleDTO | null
  onClose: () => void
  onSubmit: (id: string, data: { name?: string; odometer?: number }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [odometer, setOdometer] = useState('')
  const [initId, setInitId] = useState('')

  if (vehicle && initId !== vehicle.id) {
    setInitId(vehicle.id)
    setName(vehicle.name)
    setOdometer(String(vehicle.odometer))
  }

  return (
    <Dialog open={!!vehicle} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[340px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Ubah Kendaraan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="edit-name">
              Nama
            </label>
            <input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500" htmlFor="edit-odo">
              Odometer (km)
            </label>
            <input
              id="edit-odo"
              type="number"
              inputMode="numeric"
              min={0}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!vehicle) return
              await onSubmit(vehicle.id, {
                name: name.trim() || vehicle.name,
                odometer: Math.max(0, Math.round(Number(odometer) || 0)),
              })
              onClose()
            }}
            className="w-full rounded-full bg-sky-500 py-3.5 text-sm font-bold text-white active:scale-[0.98]"
          >
            Simpan Perubahan
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
