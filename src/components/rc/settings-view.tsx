'use client'

/**
 * SettingsView — halaman "Profil" (dirender dalam slide-over oleh parent).
 *
 * Redesign: layout VERTIKAL dengan hierarki jelas (bukan grid kotak-kotak):
 *   A. Header profil     — avatar inisial, nama, email, tombol edit
 *   B. Kendaraan utama   — satu kartu horizontal rapi (foto, nama, polisi,
 *                          odometer, status utama) + kelola kendaraan
 *   C. Servis terakhir   — SATU kartu utama menonjol
 *   D. Riwayat servis    — timeline vertikal (terbaru di atas) + Lihat Semua
 *   E. Pengaturan        — daftar vertikal di bawah (tema, notifikasi,
 *                          bantuan, tentang, reset, keluar)
 *
 * Semua angka diambil dari props — tidak ada data karangan.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BellRing,
  Bike,
  CircleHelp,
  CalendarDays,
  ChevronRight,
  Gauge,
  ImageOff,
  Info,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import type { RecordDTO, VehicleDTO } from '@/lib/state'
import { formatDate, formatKm } from '@/lib/status'
import {
  Btn,
  Card,
  ConfirmSheet,
  EmptyState,
  formatRupiah,
  IconBtn,
  inputCls,
  Pill,
  Sheet,
} from '@/components/rc/ui'
import { cn } from '@/lib/utils'
import { useMounted } from '@/lib/use-mounted'
import { LogoMark } from '@/components/rc/brand'

export interface SettingsViewProps {
  user: { id: string; name: string; email: string }
  vehicles: VehicleDTO[]
  currentVehicleId: string
  /** Riwayat servis kendaraan aktif (terbaru lebih dulu dari server) */
  records: RecordDTO[]
  reminder: boolean
  onToggleReminder: () => void
  onAddVehicle: () => void
  onEditVehicle: (v: VehicleDTO) => void
  onDeleteVehicle: (v: VehicleDTO) => void
  onResetData: () => void
  onLogout: () => void
  onBack: () => void
  /** Buka halaman Riwayat lengkap */
  onOpenHistory: () => void
  /** Simpan perubahan profil (nama/email) ke server */
  onRenameUser: (data: { name?: string; email?: string }) => Promise<void>
}

const THEMES = [
  { value: 'light', label: 'Terang' },
  { value: 'system', label: 'Sistem' },
  { value: 'dark', label: 'Gelap' },
] as const

/** Ikon kategori servis — semua entri riwayat memakai ikon servis seragam. */
function serviceIcon(): { Icon: LucideIcon } {
  return { Icon: Wrench }
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'M'
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/** Baris menu pengaturan — daftar vertikal, bukan grid. */
function MenuRow({
  icon: Icon,
  title,
  desc,
  onClick,
  danger,
  trailing,
}: {
  icon: LucideIcon
  title: string
  desc?: string
  onClick?: () => void
  danger?: boolean
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'press flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-muted/60',
        'border-b border-border/50'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          danger ? 'bg-danger/10 text-danger' : 'bg-muted text-foreground'
        )}
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[14px] font-extrabold',
            danger ? 'text-danger' : 'text-foreground'
          )}
        >
          {title}
        </span>
        {desc && (
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{desc}</span>
        )}
      </span>
      {trailing ?? <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
    </button>
  )
}

export function SettingsView({
  user,
  vehicles,
  currentVehicleId,
  records,
  reminder,
  onToggleReminder,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onResetData,
  onLogout,
  onBack,
  onOpenHistory,
  onRenameUser,
}: SettingsViewProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  // ---------- Sheet lokal ----------
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [manageVehicles, setManageVehicles] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState<VehicleDTO | null>(null)

  const vehicle = vehicles.find((v) => v.id === currentVehicleId) ?? vehicles[0] ?? null

  // Riwayat servis: server sudah urut terbaru — pakai apa adanya.
  const lastService = records[0] ?? null
  const timeline = useMemo(() => records.slice(0, 5), [records])

  async function saveProfile() {
    if (editSaving) return
    const name = editName.trim()
    const email = editEmail.trim().toLowerCase()
    if (name.length < 2) {
      setEditError('Nama minimal 2 karakter')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const changed: { name?: string; email?: string } = {}
      if (name !== user.name) changed.name = name
      if (email !== user.email) changed.email = email
      if (Object.keys(changed).length > 0) {
        await onRenameUser(changed)
      }
      setEditProfileOpen(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Gagal menyimpan profil')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-6 px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* ---------- Header ---------- */}
      <FadeUp>
        <div className="flex items-center gap-3">
          <IconBtn label="Kembali" tone="card" onClick={onBack}>
            <ArrowLeft size={20} />
          </IconBtn>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Profil</h1>
        </div>
      </FadeUp>

      {/* ---------- A. Header profil ---------- */}
      <FadeUp delay={0.04}>
        <Card className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink text-[20px] font-extrabold text-background">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-extrabold leading-tight text-foreground">
              {user.name}
            </p>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Pill tone="lime">Akun MotoMate</Pill>
            </div>
          </div>
          <IconBtn
            label="Edit profil"
            tone="card"
            className="h-10 w-10 shrink-0"
            onClick={() => {
              setEditName(user.name)
              setEditEmail(user.email)
              setEditError(null)
              setEditProfileOpen(true)
            }}
          >
            <Pencil size={16} />
          </IconBtn>
        </Card>
      </FadeUp>

      {/* ---------- B. Kendaraan utama ---------- */}
      {vehicle && (
        <FadeUp delay={0.08}>
          <section>
            <h2 className="mb-2.5 px-1 text-[15px] font-extrabold tracking-tight text-foreground">
              Kendaraan
            </h2>
            <Card padded={false} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Foto kendaraan dari aset yang tersedia; fallback ikon bila tak ada */}
                <span className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                  {vehicle.imageKey ? (
                    <Image
                      src={`/images/${vehicle.imageKey}.png`}
                      alt={`Foto ${vehicle.name}`}
                      width={96}
                      height={80}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <ImageOff size={20} className="text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-extrabold text-foreground">
                      {vehicle.name}
                    </p>
                    <Pill tone="lime">Utama</Pill>
                  </div>
                  {vehicle.plate ? (
                    <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-muted-foreground">
                      <MapPin size={12} /> {vehicle.plate}
                    </p>
                  ) : null}
                  <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                    <Gauge size={12} />
                    <span className="stat-num text-[13px] text-foreground">
                      {formatKm(vehicle.odometer)}
                    </span>
                    km odometer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManageVehicles((v) => !v)}
                aria-expanded={manageVehicles}
                className="press flex w-full items-center justify-between border-t border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="flex items-center gap-2 text-[13px] font-extrabold text-foreground">
                  <Bike size={15} />
                  Kelola kendaraan ({vehicles.length})
                </span>
                <ChevronRight
                  size={16}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform',
                    manageVehicles && 'rotate-90'
                  )}
                />
              </button>
              {manageVehicles && (
                <div className="border-t border-border/60 bg-muted/30 px-4 py-3">
                  <div className="space-y-2">
                    {vehicles.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card px-3 py-2.5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Bike size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[13px] font-extrabold text-foreground">
                              {v.name}
                            </p>
                            {v.id === currentVehicleId && <Pill tone="lime">Aktif</Pill>}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {v.type === 'mobil' ? 'Mobil' : 'Motor'} · {formatKm(v.odometer)} km
                          </p>
                        </div>
                        <IconBtn
                          label={`Ubah ${v.name}`}
                          tone="ghost"
                          className="h-9 w-9"
                          onClick={() => onEditVehicle(v)}
                        >
                          <Pencil size={15} />
                        </IconBtn>
                        <IconBtn
                          label={`Hapus ${v.name}`}
                          tone="ghost"
                          className="h-9 w-9 hover:text-danger"
                          onClick={() => setConfirmDel(v)}
                        >
                          <Trash2 size={15} />
                        </IconBtn>
                      </div>
                    ))}
                    <Btn variant="outline" full onClick={onAddVehicle}>
                      <Plus size={16} /> Tambah Kendaraan
                    </Btn>
                  </div>
                </div>
              )}
            </Card>
          </section>
        </FadeUp>
      )}

      {/* ---------- C. Servis terakhir (kartu utama) ---------- */}
      <FadeUp delay={0.12}>
        <section>
          <h2 className="mb-2.5 px-1 text-[15px] font-extrabold tracking-tight text-foreground">
            Servis Terakhir
          </h2>
          {lastService ? (
            <Card className="relative overflow-hidden border-lime/50 bg-gradient-to-br from-lime/15 via-card to-card">
              <div className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-on-lime">
                  <Wrench size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-extrabold leading-tight text-foreground">
                    {lastService.componentName}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} /> {formatDate(lastService.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge size={12} />
                      <span className="stat-num text-[12.5px] text-foreground">
                        {formatKm(lastService.odometer)}
                      </span>
                      km
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-3.5 flex items-end justify-between gap-3 rounded-2xl bg-card/80 px-3.5 py-2.5 ring-1 ring-border/60">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total biaya
                  </p>
                  <p className="mt-0.5 leading-none">
                    {lastService.cost != null ? (
                      <>
                        <span className="stat-num text-[18px] text-foreground">
                          Rp{formatRupiah(lastService.cost)}
                        </span>
                        {lastService.workshop ? (
                          <span className="ml-2 truncate text-[11px] font-semibold text-muted-foreground">
                            di {lastService.workshop}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-[13px] font-semibold text-muted-foreground">
                        Tidak dicatat
                      </span>
                    )}
                  </p>
                </div>
                <Pill tone="lime">{lastService.type === 'servis' ? 'Servis' : 'Ganti'}</Pill>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={<Wrench size={20} />}
              title="Belum ada servis tercatat"
              desc="Catat servis pertama di halaman Perawatan untuk mulai memantau kondisi motor."
            />
          )}
        </section>
      </FadeUp>

      {/* ---------- D. Riwayat servis — timeline vertikal ---------- */}
      <FadeUp delay={0.16}>
        <section>
          <div className="mb-2.5 flex items-end justify-between px-1">
            <h2 className="text-[15px] font-extrabold tracking-tight text-foreground">
              Riwayat Servis
            </h2>
            {records.length > 0 && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="press text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                Lihat Semua
              </button>
            )}
          </div>
          {timeline.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={20} />}
              title="Riwayat masih kosong"
              desc="Setiap servis yang dicatat akan muncul di sini, terbaru di atas."
            />
          ) : (
            <Card padded={false} className="px-5 py-4">
              <ol className="relative">
                {timeline.map((r, i) => {
                  const isLast = i === timeline.length - 1
                  const { Icon } = serviceIcon()
                  return (
                    <li key={r.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {/* Garis timeline */}
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[15px] top-8 h-[calc(100%-32px)] w-px bg-border"
                        />
                      )}
                      <span
                        className={cn(
                          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                          i === 0 ? 'bg-lime text-on-lime' : 'bg-muted text-foreground'
                        )}
                      >
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="truncate text-[13.5px] font-extrabold leading-tight text-foreground">
                          {r.componentName}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] font-semibold text-muted-foreground">
                          <span>{formatDate(r.date)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="stat-num">{formatKm(r.odometer)}</span> km
                          {r.cost != null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="flex items-center gap-0.5">
                                <Wallet size={11} /> Rp{formatRupiah(r.cost)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Card>
          )}
        </section>
      </FadeUp>

      {/* ---------- E. Pengaturan — daftar vertikal ---------- */}
      <FadeUp delay={0.2}>
        <section>
          <h2 className="mb-2.5 px-1 text-[15px] font-extrabold tracking-tight text-foreground">
            Pengaturan
          </h2>
          <Card padded={false} className="overflow-hidden">
            <MenuRow
              icon={UserRound}
              title="Edit Profil"
              desc="Ubah nama & email akun"
              onClick={() => {
                setEditName(user.name)
                setEditEmail(user.email)
                setEditError(null)
                setEditProfileOpen(true)
              }}
            />
            <MenuRow
              icon={Bike}
              title="Pengaturan Kendaraan"
              desc={`${vehicles.length} kendaraan terdaftar`}
              onClick={() => setManageVehicles(true)}
            />
            <MenuRow
              icon={RefreshCw}
              title="Pengaturan Tema"
              desc={
                mounted
                  ? theme === 'light'
                    ? 'Mode terang'
                    : theme === 'dark'
                      ? 'Mode gelap'
                      : 'Ikuti sistem'
                  : '—'
              }
              onClick={() => setThemeOpen(true)}
            />
            <MenuRow
              icon={BellRing}
              title="Notifikasi Pengingat"
              desc="Peringatan saat komponen mendekati batas"
              trailing={
                <span
                  role="switch"
                  aria-checked={reminder}
                  aria-label="Notifikasi Pengingat"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleReminder()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onToggleReminder()
                    }
                  }}
                  tabIndex={0}
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
                </span>
              }
              onClick={onToggleReminder}
            />
            <MenuRow
              icon={CircleHelp}
              title="Bantuan"
              desc="Tips GPS, offline & sinkronisasi"
              onClick={() => setHelpOpen(true)}
            />
            <MenuRow
              icon={Info}
              title="Tentang MotoMate"
              desc="Versi aplikasi & kredit"
              onClick={() => setAboutOpen(true)}
            />
            <MenuRow
              icon={RefreshCw}
              title="Reset Data"
              desc="Hapus seluruh data akun ini"
              danger
              onClick={onResetData}
            />
            <MenuRow icon={LogOut} title="Keluar" danger onClick={onLogout} />
          </Card>
        </section>
      </FadeUp>

      {/* Footer */}
      <FadeUp delay={0.24}>
        <div className="flex flex-col items-center gap-2 pt-2">
          <LogoMark size={30} label="Logo MotoMate" />
          <p className="text-center text-[11px] text-muted-foreground">
            MotoMate v2.0 · Dibuat untuk pengendara Indonesia
          </p>
        </div>
      </FadeUp>

      {/* ---------- Sheet: edit profil ---------- */}
      <Sheet
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Edit Profil"
        zIndex={60}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-[12px] font-bold text-muted-foreground">Nama</span>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={60}
              autoComplete="name"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-[12px] font-bold text-muted-foreground">Email</span>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              autoComplete="email"
              className={inputCls}
            />
          </label>
          {editError && (
            <p className="rounded-2xl bg-danger/10 px-4 py-2.5 text-[12px] font-semibold text-danger">
              {editError}
            </p>
          )}
          <Btn variant="lime" full onClick={saveProfile} disabled={editSaving}>
            {editSaving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Btn>
        </div>
      </Sheet>

      {/* ---------- Sheet: tema ---------- */}
      <Sheet
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        title="Pengaturan Tema"
        zIndex={60}
      >
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = mounted && theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'press min-h-20 rounded-2xl border text-[13px] font-bold transition-colors',
                  active
                    ? 'border-lime bg-lime text-on-lime'
                    : 'border-border bg-card text-muted-foreground'
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          Tema juga bisa dicoba langsung di perkenalan aplikasi.
        </p>
      </Sheet>

      {/* ---------- Sheet: bantuan ---------- */}
      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Bantuan" zIndex={60}>
        <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="font-extrabold text-foreground">GPS &amp; perjalanan</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Nyalakan Layanan Lokasi &amp; izinkan akses lokasi untuk MotoMate.</li>
              <li>Di browser, rekam hanya berjalan saat layar menyala — untuk layar terkunci gunakan aplikasi Android.</li>
              <li>GPS hilang sejenak tidak menghapus sesi; rekam lanjut otomatis saat sinyal kembali.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="font-extrabold text-foreground">Offline &amp; sinkronisasi</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Perjalanan tersimpan aman di perangkat walau internet putus.</li>
              <li>Begitu koneksi kembali, data terkirim otomatis — tidak ada duplikat.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="font-extrabold text-foreground">Data</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Odometer bertambah otomatis dari jarak perjalanan GPS.</li>
              <li>Reset Data hanya menghapus akun ini, kendaraan &amp; riwayatnya.</li>
            </ul>
          </div>
        </div>
      </Sheet>

      {/* ---------- Sheet: tentang ---------- */}
      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title="Tentang MotoMate" zIndex={60}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <LogoMark size={64} label="Logo MotoMate" />
          <p className="text-[15px] font-extrabold text-foreground">MotoMate</p>
          <p className="text-[12px] font-semibold text-muted-foreground">Versi 2.0 (web + Android)</p>
          <p className="max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
            Asisten perawatan motor: pantau komponen, rekam perjalanan GPS, catat
            pengeluaran, dan temukan bengkel — dibuat untuk pengendara Indonesia.
          </p>
        </div>
      </Sheet>

      {/* ---------- Konfirmasi hapus kendaraan ---------- */}
      <ConfirmSheet
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) onDeleteVehicle(confirmDel)
          setConfirmDel(null)
        }}
        title={`Hapus ${confirmDel?.name ?? ''}?`}
        desc="Kendaraan beserta riwayat servis dan perjalanannya akan dihapus permanen."
        confirmLabel="Hapus"
        danger
      />
    </div>
  )
}
