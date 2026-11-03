'use client'

/**
 * HistoryEditSheets — sheet edit untuk entri riwayat:
 * perjalanan (trip), pengeluaran (expense), dan catatan servis (record).
 * Semua menyimpan lewat PATCH API; sisa pakai komponen & odometer
 * ikut disesuaikan otomatis di server.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ExpenseDTO, RecordDTO, TripDTO } from '@/lib/state'
import { Btn, Field, Sheet, inputCls, selectCls } from '@/components/rc/ui'

function todayInput(): string {
  const d = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateInput(iso: string): string {
  const d = new Date(iso)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const HINT_SYNC = 'Odometer & sisa pakai komponen ikut disesuaikan otomatis'

// ---------- Edit Perjalanan ----------

export function EditTripSheet({
  open,
  trip,
  onClose,
  onSubmit,
}: {
  open: boolean
  trip: TripDTO | null
  onClose: () => void
  onSubmit: (id: string, data: { distance: number; date: string }) => Promise<void>
}) {
  const [distance, setDistance] = useState('')
  const [date, setDate] = useState(todayInput())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && trip) {
      setDistance(String(trip.distance))
      setDate(dateInput(trip.startedAt))
    }
  }, [open, trip])

  const submit = async () => {
    if (!trip) return
    const dist = Number(distance) || 0
    if (dist <= 0) return toast.error('Jarak wajib diisi (lebih dari 0)')
    setSaving(true)
    try {
      await onSubmit(trip.id, { distance: Math.round(dist * 10) / 10, date })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan perjalanan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit Perjalanan">
      <div className="flex flex-col gap-4">
        <Field label="Jarak (km)">
          <input
            className={inputCls}
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="cth. 12,5"
          />
        </Field>
        <Field label="Tanggal perjalanan">
          <input
            type="date"
            className={inputCls}
            value={date}
            max={todayInput()}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <p className="rounded-2xl bg-muted px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          {HINT_SYNC} — mengubah jarak akan menyesuaikan odometer kendaraan.
        </p>
        <Btn variant="lime" full onClick={submit} disabled={saving || !trip}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </Btn>
      </div>
    </Sheet>
  )
}

// ---------- Edit Pengeluaran ----------

const EXPENSE_CATEGORIES = [
  { value: 'bensin', label: 'Bensin' },
  { value: 'parkir', label: 'Parkir' },
  { value: 'servis', label: 'Servis' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

export function EditExpenseSheet({
  open,
  expense,
  onClose,
  onSubmit,
}: {
  open: boolean
  expense: ExpenseDTO | null
  onClose: () => void
  onSubmit: (
    id: string,
    data: { category: string; amount: number; liters?: number | null; note: string; date: string }
  ) => Promise<void>
}) {
  const [category, setCategory] = useState('bensin')
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayInput())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && expense) {
      setCategory(expense.category)
      setAmount(String(expense.amount))
      setLiters(expense.liters != null ? String(expense.liters) : '')
      setNote(expense.note ?? '')
      setDate(dateInput(expense.date))
    }
  }, [open, expense])

  const submit = async () => {
    if (!expense) return
    const amt = Math.round(Number(amount) || 0)
    if (amt <= 0) return toast.error('Jumlah pengeluaran wajib diisi')
    setSaving(true)
    try {
      await onSubmit(expense.id, {
        category,
        amount: amt,
        liters: category === 'bensin' && liters ? Number(liters) || null : null,
        note: note.trim(),
        date,
      })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan pengeluaran')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit Pengeluaran">
      <div className="flex flex-col gap-4">
        <Field label="Kategori">
          <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jumlah (Rp)">
          <input
            className={inputCls}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="cth. 25000"
          />
        </Field>
        {category === 'bensin' && (
          <Field label="Jumlah bensin (liter)" hint="Opsional">
            <input
              className={inputCls}
              inputMode="decimal"
              value={liters}
              onChange={(e) => setLiters(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="cth. 2,5"
            />
          </Field>
        )}
        <Field label="Catatan" hint="Opsional">
          <input
            className={inputCls}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="cth. Isi di Pertamina"
          />
        </Field>
        <Field label="Tanggal">
          <input
            type="date"
            className={inputCls}
            value={date}
            max={todayInput()}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Btn variant="lime" full onClick={submit} disabled={saving || !expense}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </Btn>
      </div>
    </Sheet>
  )
}

// ---------- Edit Catatan Servis ----------

export function EditRecordSheet({
  open,
  record,
  onClose,
  onSubmit,
}: {
  open: boolean
  record: RecordDTO | null
  onClose: () => void
  onSubmit: (
    id: string,
    data: { type: string; odometer: number; date: string; cost: number | null; workshop: string; note: string }
  ) => Promise<void>
}) {
  const [type, setType] = useState<'ganti' | 'servis'>('ganti')
  const [odo, setOdo] = useState('')
  const [date, setDate] = useState(todayInput())
  const [cost, setCost] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && record) {
      setType(record.type === 'servis' ? 'servis' : 'ganti')
      setOdo(String(record.odometer))
      setDate(dateInput(record.date))
      setCost(record.cost != null ? String(record.cost) : '')
      setWorkshop(record.workshop ?? '')
      setNote(record.note ?? '')
    }
  }, [open, record])

  const submit = async () => {
    if (!record) return
    const km = Math.round(Number(odo) || 0)
    if (km <= 0) return toast.error('Odometer wajib diisi')
    setSaving(true)
    try {
      await onSubmit(record.id, {
        type,
        odometer: km,
        date,
        cost: cost ? Math.round(Number(cost) || 0) : null,
        workshop: workshop.trim(),
        note: note.trim(),
      })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan catatan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit Catatan Servis">
      <div className="flex flex-col gap-4">
        <Field label="Komponen">
          <input className={`${inputCls} opacity-60`} value={record?.componentName ?? ''} disabled />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(['ganti', 'servis'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`press min-h-11 rounded-2xl border text-sm font-bold ${
                type === t
                  ? 'border-lime bg-lime text-on-lime'
                  : 'border-input bg-card text-muted-foreground'
              }`}
            >
              {t === 'ganti' ? 'Ganti Komponen' : 'Servis / Tune Up'}
            </button>
          ))}
        </div>
        <Field label="Kilometer saat servis">
          <input
            className={inputCls}
            inputMode="numeric"
            value={odo}
            onChange={(e) => setOdo(e.target.value.replace(/[^\d]/g, ''))}
          />
        </Field>
        <Field label="Tanggal servis">
          <input
            type="date"
            className={inputCls}
            value={date}
            max={todayInput()}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Biaya (Rp)" hint="Opsional">
          <input
            className={inputCls}
            inputMode="numeric"
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="cth. 85000"
          />
        </Field>
        <Field label="Bengkel" hint="Opsional">
          <input
            className={inputCls}
            value={workshop}
            onChange={(e) => setWorkshop(e.target.value)}
            placeholder="cth. AHASS Motor Cerdas"
          />
        </Field>
        <Field label="Catatan" hint="Opsional">
          <textarea
            className={`${inputCls} min-h-20 py-3`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="cth. Oli 0.8L, filter baru"
          />
        </Field>
        <p className="rounded-2xl bg-muted px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          Jika ini catatan terbaru komponennya, sisa pakai komponen ikut dihitung ulang otomatis.
        </p>
        <Btn variant="lime" full onClick={submit} disabled={saving || !record}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </Btn>
      </div>
    </Sheet>
  )
}
