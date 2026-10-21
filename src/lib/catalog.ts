// Katalog komponen kendaraan (seperti RideCheck)
export interface CatalogItem {
  key: string
  name: string
  icon: string
  intervalKm: number
  intervalDays: number
  category: 'engine' | 'brake' | 'cvt' | 'electrical' | 'other'
  info: string
}

export const MOTOR_CATALOG: CatalogItem[] = [
  {
    key: 'oli-mesin',
    name: 'Oli Mesin',
    icon: 'droplets',
    intervalKm: 2000,
    intervalDays: 60,
    category: 'engine',
    info: 'Oli mesin melumasi komponen mesin. Ganti setiap 2.000 km atau 2 bulan agar mesin awet.',
  },
  {
    key: 'filter-oli',
    name: 'Filter Oli Mesin',
    icon: 'filter',
    intervalKm: 4000,
    intervalDays: 120,
    category: 'engine',
    info: 'Filter oli menyaring kotoran pada oli mesin. Ganti setiap 2x penggantian oli.',
  },
  {
    key: 'filter-udara',
    name: 'Filter Udara',
    icon: 'wind',
    intervalKm: 8000,
    intervalDays: 180,
    category: 'engine',
    info: 'Filter udara menyaring debu sebelum masuk mesin. Kotor dapat menurunkan performa & iritasi bahan bakar.',
  },
  {
    key: 'busi',
    name: 'Busi',
    icon: 'zap',
    intervalKm: 8000,
    intervalDays: 180,
    category: 'engine',
    info: 'Busi memicu pembakaran di mesin. Busi aus menyebabkan motor sulit dinyalakan.',
  },
  {
    key: 'oli-gardan',
    name: 'Oli Gardan',
    icon: 'droplet',
    intervalKm: 8000,
    intervalDays: 365,
    category: 'engine',
    info: 'Oli gardan melumasi transmisi akhir (gear matic). Ganti setiap 8.000 km atau 12 bulan.',
  },
  {
    key: 'kampas-rem',
    name: 'Kampas Rem',
    icon: 'circle-dot',
    intervalKm: 20000,
    intervalDays: 730,
    category: 'brake',
    info: 'Kampas rem menahan roda. Tipis kurang dari 1,5 mm harus segera diganti.',
  },
  {
    key: 'cakram-rem',
    name: 'Cakram Rem',
    icon: 'disc-3',
    intervalKm: 20000,
    intervalDays: 730,
    category: 'brake',
    info: 'Cakram rem bekerja bersama kampas rem. Periksa ketebalan dan kehilangan permukaannya.',
  },
  {
    key: 'minyak-rem',
    name: 'Minyak Rem',
    icon: 'glass-water',
    intervalKm: 20000,
    intervalDays: 730,
    category: 'brake',
    info: 'Minyak rem menyalurkan tekanan tuas rem. Ganti setiap 2 tahun karena sifatnya menyerap air.',
  },
  {
    key: 'filter-bahan-bakar',
    name: 'Filter Bahan Bakar',
    icon: 'fuel',
    intervalKm: 20000,
    intervalDays: 730,
    category: 'engine',
    info: 'Filter bahan bakar menyaring kotoran bensin sebelum masuk ke injeksi/karburator.',
  },
  {
    key: 'air-radiator',
    name: 'Air Radiator',
    icon: 'waves',
    intervalKm: 20000,
    intervalDays: 730,
    category: 'engine',
    info: 'Cairan radiator menjaga suhu mesin tetap stabil. Periksa volume dan ganti secara berkala.',
  },
  {
    key: 'v-belt-cvt',
    name: 'V-Belt CVT',
    icon: 'spline',
    intervalKm: 24000,
    intervalDays: 730,
    category: 'cvt',
    info: 'V-Belt mentransmisikan tenaga mesin ke roda. Retak atau melar membuat motor terasa berat.',
  },
  {
    key: 'roller-cvt',
    name: 'Roller CVT',
    icon: 'donut',
    intervalKm: 24000,
    intervalDays: 730,
    category: 'cvt',
    info: 'Roller CVT mengatur perpindahan gigi otomatis. Flat spot membuat tarikan tidak halus.',
  },
  {
    key: 'aki-12v',
    name: 'Aki 12V',
    icon: 'battery-charging',
    intervalKm: 12000,
    intervalDays: 365,
    category: 'electrical',
    info: 'Aki menyuplai listrik motor untuk starter dan lampu. Lemah membuat motor sulit dinyalakan.',
  },
  {
    key: 'tensioner-v-belt',
    name: 'Tensioner V-Belt CVT',
    icon: 'link-2',
    intervalKm: 24000,
    intervalDays: 730,
    category: 'cvt',
    info: 'Tensioner menjaga ketegangan V-Belt. Periksa saat mengganti V-Belt CVT.',
  },
  {
    key: 'rantai-gir',
    name: 'Rantai & Gir',
    icon: 'link',
    intervalKm: 8000,
    intervalDays: 180,
    category: 'other',
    info: 'Rantai penggerak untuk motor manual. Lumasi dan kencangkan secara berkala.',
  },
]

export const CAR_CATALOG: CatalogItem[] = [
  {
    key: 'oli-mesin',
    name: 'Oli Mesin',
    icon: 'droplets',
    intervalKm: 10000,
    intervalDays: 180,
    category: 'engine',
    info: 'Oli mesin mobil diganti setiap 10.000 km atau 6 bulan.',
  },
  {
    key: 'filter-oli',
    name: 'Filter Oli Mesin',
    icon: 'filter',
    intervalKm: 10000,
    intervalDays: 180,
    category: 'engine',
    info: 'Filter oli mobil diganti bersama oli mesin.',
  },
  {
    key: 'filter-udara',
    name: 'Filter Udara',
    icon: 'wind',
    intervalKm: 20000,
    intervalDays: 365,
    category: 'engine',
    info: 'Filter udara mobil diganti setiap 20.000 km.',
  },
  {
    key: 'busi',
    name: 'Busi',
    icon: 'zap',
    intervalKm: 40000,
    intervalDays: 730,
    category: 'engine',
    info: 'Busi mobil iridium dapat bertahan hingga 40.000 km.',
  },
  {
    key: 'kampas-rem',
    name: 'Kampas Rem',
    icon: 'circle-dot',
    intervalKm: 40000,
    intervalDays: 730,
    category: 'brake',
    info: 'Kampas rem mobil depan biasanya bertahan 40.000 km.',
  },
  {
    key: 'minyak-rem',
    name: 'Minyak Rem',
    icon: 'glass-water',
    intervalKm: 40000,
    intervalDays: 730,
    category: 'brake',
    info: 'Ganti minyak rem setiap 2 tahun.',
  },
  {
    key: 'aki-12v',
    name: 'Aki 12V',
    icon: 'battery-charging',
    intervalKm: 0,
    intervalDays: 540,
    category: 'electrical',
    info: 'Aki mobil biasanya bertahan 1,5 - 2 tahun.',
  },
  {
    key: 'filter-bahan-bakar',
    name: 'Filter Bahan Bakar',
    icon: 'fuel',
    intervalKm: 40000,
    intervalDays: 730,
    category: 'engine',
    info: 'Filter bahan bakar diganti setiap 40.000 km.',
  },
  {
    key: 'air-radiator',
    name: 'Air Radiator',
    icon: 'waves',
    intervalKm: 40000,
    intervalDays: 730,
    category: 'engine',
    info: 'Coolant diganti setiap 40.000 km atau 2 tahun.',
  },
]

export function getCatalog(type: string): CatalogItem[] {
  return type === 'mobil' ? CAR_CATALOG : MOTOR_CATALOG
}

export function getCatalogItem(type: string, key: string): CatalogItem | undefined {
  return getCatalog(type).find((c) => c.key === key)
}
