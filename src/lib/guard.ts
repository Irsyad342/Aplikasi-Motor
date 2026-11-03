import 'server-only'

import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

/** ID user dari sesi httpOnly — null bila belum login. */
export async function sessionUserId(): Promise<string | null> {
  const user = await getSessionUser()
  return user?.id ?? null
}

/**
 * Cari kendaraan MILIK user yang sedang login.
 * Semua data (komponen, servis, trip, pengeluaran) terikat ke kendaraan,
 * jadi cukup memverifikasi kepemilikan kendaraan di setiap endpoint.
 */
export function ownedVehicle(vehicleId: string, userId: string) {
  return db.vehicle.findFirst({ where: { id: vehicleId, userId } })
}
