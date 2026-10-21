import type { LatLng } from '@/lib/geo'
import { haversineKm } from '@/lib/geo'

export interface Bengkel {
  id: string
  name: string
  type: 'resmi' | 'umum'
  brand: string
  rating?: number
  reviews?: number
  lat: number
  lng: number
  city: string
  province: string
  address: string
  hours?: string
  phone?: string
  services: string[]
  /** true bila berasal dari data live OpenStreetMap */
  live?: boolean
}

/** Batas Pulau Jawa (termasuk Madura) — bengkel di luar area ini tidak ditampilkan */
export const JAVA_BBOX = {
  minLat: -9.1,
  maxLat: -5.5,
  minLng: 105.0,
  maxLng: 114.9,
}

export function isInJava(lat: number, lng: number): boolean {
  return (
    lat >= JAVA_BBOX.minLat &&
    lat <= JAVA_BBOX.maxLat &&
    lng >= JAVA_BBOX.minLng &&
    lng <= JAVA_BBOX.maxLng
  )
}

/** Klasifikasi resmi/umum + brand dari nama bengkel */
export function classifyBengkel(name: string): { type: 'resmi' | 'umum'; brand: string } {
  const n = name.toLowerCase()
  if (n.includes('ahass') || n.includes('astra honda') || n.includes('honda'))
    return { type: 'resmi', brand: 'Honda' }
  if (n.includes('yamaha') || n.includes('ymc') || n.includes('yss'))
    return { type: 'resmi', brand: 'Yamaha' }
  if (n.includes('suzuki')) return { type: 'resmi', brand: 'Suzuki' }
  if (n.includes('kawasaki')) return { type: 'resmi', brand: 'Kawasaki' }
  if (n.includes('vespa') || n.includes('piaggio')) return { type: 'resmi', brand: 'Vespa' }
  if (n.includes('hero')) return { type: 'resmi', brand: 'Hero' }
  return { type: 'umum', brand: 'Multi Brand' }
}

/** Cek buka/tutup berdasarkan jam buka pada waktu sekarang (toleran format bebas) */
export function isOpenNow(hours: string | undefined, now = new Date()): boolean {
  if (!hours) return true
  if (/24\/7|24 jam/i.test(hours)) return true
  const m = hours.match(/(\d{1,2})[.:](\d{2})?\s*-\s*(\d{1,2})[.:](\d{2})?/)
  if (!m) return true
  const cur = now.getHours() * 60 + now.getMinutes()
  const open = Number(m[1]) * 60 + Number(m[2] ?? 0)
  const close = Number(m[3]) * 60 + Number(m[4] ?? 0)
  return cur >= open && cur < close
}

// ---------- Dataset fallback deterministik (dipakai bila API peta tidak terjangkau) ----------

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface CityDef {
  city: string
  province: string
  lat: number
  lng: number
  code: string // kode area telepon
  roads: string[]
  count: number
}

/** Hanya kota-kota di Pulau Jawa (Banten, DKI, Jabar, Jateng, DIY, Jatim) */
const CITY_DEFS: CityDef[] = [
  {
    city: 'Jakarta Pusat', province: 'DKI Jakarta', lat: -6.1823, lng: 106.8292, code: '21', count: 14,
    roads: ['Kramat Raya', 'M.H. Thamrin', 'Cikini Raya', 'Salemba Tengah', 'Pramuka', 'Kebon Sirih', 'Gajah Mada', 'Hayam Wuruk', 'Senen Raya', 'Menteng Dalam', 'Angkasa Raya'],
  },
  {
    city: 'Jakarta Selatan', province: 'DKI Jakarta', lat: -6.2469, lng: 106.8010, code: '21', count: 14,
    roads: ['Tebet Raya', 'Kebayoran Lama', 'Cilandak KKO', 'Panglima Polim', 'Blok M', 'Fatmawati', 'Pondok Indah', 'Kemang Raya', 'Warung Buncit', 'Ampera Raya', 'Cipete Raya'],
  },
  {
    city: 'Jakarta Barat', province: 'DKI Jakarta', lat: -6.1683, lng: 106.7669, code: '21', count: 11,
    roads: ['S. Parman', 'Tomang Raya', 'Grogol Utama', 'Puri Kembangan', 'Daan Mogot', 'Taman Kota', 'Palmerah Barat', 'Slipi Raya', 'Meruya Utara', 'Cengkareng'],
  },
  {
    city: 'Jakarta Timur', province: 'DKI Jakarta', lat: -6.2253, lng: 106.9000, code: '21', count: 11,
    roads: ['Dewi Sartika', 'Pondok Kelapa', 'Cempaka Putih Tengah', 'Pemuda', 'Kayu Putih Raya', 'Cipinang Raya', 'Klampis Jaya', 'Bulak Ringin'],
  },
  {
    city: 'Jakarta Utara', province: 'DKI Jakarta', lat: -6.1528, lng: 106.8783, code: '21', count: 9,
    roads: ['Danau Sunter Utara', 'Pluit Karang', 'Kelapa Gading Boulevard', 'Yos Sudarso', 'Mangga Dua Raya', 'Sunter Agung'],
  },
  {
    city: 'Bogor', province: 'Jawa Barat', lat: -6.5950, lng: 106.8166, code: '251', count: 8,
    roads: ['Pajajaran', 'Pandu Raya', 'Merdeka', 'Dramaga', 'Heulang', 'Cibuluh', 'Semeru'],
  },
  {
    city: 'Depok', province: 'Jawa Barat', lat: -6.4025, lng: 106.7942, code: '21', count: 8,
    roads: ['Margonda Raya', 'Nusantara', 'Juanda', 'Sawangan', 'Cinere Raya', 'Boulevard Raya', 'Arief Rahman Hakim'],
  },
  {
    city: 'Bekasi', province: 'Jawa Barat', lat: -6.2383, lng: 106.9756, code: '21', count: 9,
    roads: ['Ahmad Yani', 'Cut Meutia', 'Kali Baru', 'Grand Boulevard', 'Pekayon Jaya', 'Bulevar Hijau', 'Pramuka'],
  },
  {
    city: 'Tangerang', province: 'Banten', lat: -6.1783, lng: 106.6319, code: '21', count: 8,
    roads: ['Benteng Betawi', 'Merdeka', 'Cibodas', 'Perintis Kemerdekaan', 'Gatot Subroto', 'Karawaci Barat', 'Serpong Raya'],
  },
  {
    city: 'Tangerang Selatan', province: 'Banten', lat: -6.2930, lng: 106.7160, code: '21', count: 7,
    roads: ['Science Boulevard', 'Pahlawan Seribu', 'Raya Serpong', 'Merdeka', 'Boulevard Bintaro', 'Pakuwon Indah'],
  },
  {
    city: 'Serang', province: 'Banten', lat: -6.1200, lng: 106.1500, code: '254', count: 6,
    roads: ['Syech Ibrahim', 'Raya Serang', 'Ciwaliang', 'Pandeglang', 'Labuan'],
  },
  {
    city: 'Cilegon', province: 'Banten', lat: -6.0050, lng: 106.0400, code: '254', count: 5,
    roads: ['Raya Cilegon', 'Merak', 'Kramatwatu', 'Gerendeng'],
  },
  {
    city: 'Sukabumi', province: 'Jawa Barat', lat: -6.9260, lng: 106.9260, code: '266', count: 6,
    roads: ['A. Yani', 'Selabintana', 'Kapten Muslihat', 'Raya Cibadak', 'Lengkong Jaya'],
  },
  {
    city: 'Bandung', province: 'Jawa Barat', lat: -6.9175, lng: 107.6191, code: '22', count: 12,
    roads: ['Asia Afrika', 'Dipatiukur', 'Setiabudi', 'Ahmad Yani', 'Soekarno Hatta', 'Dago', 'Cihampelas', 'Riau', 'Buah Batu'],
  },
  {
    city: 'Cirebon', province: 'Jawa Barat', lat: -6.7320, lng: 108.5520, code: '231', count: 6,
    roads: ['Siliwangi', 'DR. Djunjunan', 'Raya Ciledug', 'Kalijaga', 'Tuparev'],
  },
  {
    city: 'Tasikmalaya', province: 'Jawa Barat', lat: -7.3270, lng: 108.2200, code: '265', count: 5,
    roads: ['Indihiang', 'Dadi Harja', 'Raya Cihideung', 'Tentara Pelajar'],
  },
  {
    city: 'Tegal', province: 'Jawa Tengah', lat: -6.8797, lng: 109.1256, code: '283', count: 5,
    roads: ['A. Yani', 'Kartini', 'Raya Brebes', 'Stasiun'],
  },
  {
    city: 'Purwokerto', province: 'Jawa Tengah', lat: -7.4250, lng: 109.2340, code: '281', count: 6,
    roads: ['Overste Isdiman', 'Gatot Subroto', 'Raya Baturaden', 'Kolonel Sugiri'],
  },
  {
    city: 'Semarang', province: 'Jawa Tengah', lat: -6.9667, lng: 110.4167, code: '24', count: 10,
    roads: ['Pemuda', 'MT Haryono', 'Pandanaran', 'Sisingamangaraja', 'Dr. Cipto', 'Banyumanik', 'Sendangmulyo', 'Kaligawe'],
  },
  {
    city: 'Salatiga', province: 'Jawa Tengah', lat: -7.3305, lng: 110.5080, code: '298', count: 4,
    roads: ['Diponegoro', 'S tsunami', 'Raya Semarang'],
  },
  {
    city: 'Magelang', province: 'Jawa Tengah', lat: -7.4797, lng: 110.2177, code: '293', count: 5,
    roads: ['Pemuda', 'Raya Yogya', 'Cempaka', 'Sartono'],
  },
  {
    city: 'Surakarta', province: 'Jawa Tengah', lat: -7.5755, lng: 110.8243, code: '271', count: 8,
    roads: ['Slamet Riyadi', 'Kolonel Sutarto', 'Jenderal Sudirman', 'Ronggo Wicaksono', 'Adi Sucipto'],
  },
  {
    city: 'Yogyakarta', province: 'DI Yogyakarta', lat: -7.7956, lng: 110.3695, code: '274', count: 9,
    roads: ['Malioboro', 'Kaliurang', 'Gejayan', 'Colombo', 'Ring Road Utara', 'Imogiri Barat', 'Magelang', 'Wates'],
  },
  {
    city: 'Kediri', province: 'Jawa Timur', lat: -7.8480, lng: 112.0160, code: '354', count: 5,
    roads: ['Dhoho', 'Hayam Wuruk', 'Brawijaya', 'Raya Nganjuk'],
  },
  {
    city: 'Madiun', province: 'Jawa Timur', lat: -7.6300, lng: 111.5200, code: '351', count: 5,
    roads: ['Pahlawan', 'Setiabudi', 'Wolter Monginsidi', 'Raya Magetan'],
  },
  {
    city: 'Surabaya', province: 'Jawa Timur', lat: -7.2575, lng: 112.7521, code: '31', count: 12,
    roads: ['Mayjend Sungkono', 'Darmo', 'Raya Darmo', 'Ahmad Yani', 'HR Muhammad', 'Margorejo', 'Kutai', 'Rungkut Industri', 'Airlangga', 'Basuki Rahmat'],
  },
  {
    city: 'Sidoarjo', province: 'Jawa Timur', lat: -7.4478, lng: 112.7183, code: '31', count: 7,
    roads: ['Urip Sumoharjo', 'Raya Taman', 'Ahmad Yani', 'Raya Waru', 'Deltasari'],
  },
  {
    city: 'Malang', province: 'Jawa Timur', lat: -7.9666, lng: 112.6326, code: '341', count: 8,
    roads: ['Ijen', 'Simpang Balapgede', 'Cakrawala', 'Soekarno Hatta', 'Dinoyo', 'Tlogomas', 'Raya Lawang'],
  },
  {
    city: 'Probolinggo', province: 'Jawa Timur', lat: -7.7550, lng: 113.2100, code: '353', count: 4,
    roads: ['Suroso', 'Raya Bromo', 'Gatot Subroto', 'Panglima Sudirman'],
  },
  {
    city: 'Jember', province: 'Jawa Timur', lat: -8.1720, lng: 113.7000, code: '331', count: 5,
    roads: ['Sudirman', 'Sultan Agung', 'Kalimantan', 'Raya Sumbersari'],
  },
  {
    city: 'Banyuwangi', province: 'Jawa Timur', lat: -8.2190, lng: 114.3670, code: '333', count: 5,
    roads: ['A. Yani', 'Raya Banyuwangi', 'Ketapang', 'Blambangan'],
  },
]

const RESMI_NAMES = [
  { n: 'AHASS', b: 'Honda' },
  { n: 'Honda Karya', b: 'Honda' },
  { n: 'Yamaha Motor Center', b: 'Yamaha' },
  { n: 'Yamaha Karya', b: 'Yamaha' },
  { n: 'Suzuki SAV', b: 'Suzuki' },
  { n: 'Suzuki Prima', b: 'Suzuki' },
  { n: 'Kawasaki Plaza', b: 'Kawasaki' },
  { n: 'Astra Honda Motor', b: 'Honda' },
  { n: 'Honda Primadonna', b: 'Honda' },
]
const UMUM_NAMES = ['Jaya Motor', 'Sentosa Motor', 'Cahaya Sparepart', 'Speedmate Auto Service', 'Mandiri Motor', 'Berkah Motor', 'Rapi Motor', 'Prima Motor', 'Tunas Motor', 'Sakti Motor', 'Aneka Motor', 'Mitra Motor', 'Gapura Motor', 'Andalan Motor']
const SERVICE_POOL = ['Ganti Oli', 'Servis CVT', 'Tune Up', 'Kampas Rem', 'Ganti Ban', 'Aki', 'Elektrikal', 'Servis Berkala', 'Body Repair', 'Radiator', 'V-Belt', 'Sparepart Original', 'Tune Up Injeksi', 'Home Service', 'Servis Injeksi', 'Balancing']
const PREFIX_KOTA = ['Kota', 'Pusat', 'Cabang', 'Cabang Utama']

function generateBengkel(): Bengkel[] {
  const list: Bengkel[] = []
  let idc = 0
  let resmiPick: { n: string; b: string } | null = null

  CITY_DEFS.forEach((c, ci) => {
    const rnd = mulberry32(1000 + ci * 77)

    for (let i = 0; i < c.count; i++) {
      const isResmi = rnd() < 0.42
      const brand = isResmi
        ? ((): string => {
            const idx = Math.floor(rnd() * RESMI_NAMES.length)
            resmiPick = RESMI_NAMES[idx]
            return resmiPick.b
          })()
        : 'Multi Brand'
      const road = c.roads[Math.floor(rnd() * c.roads.length)]
      const no = 1 + Math.floor(rnd() * 120)

      let name: string
      if (isResmi) {
        const base = resmiPick!.n
        const suffix = PREFIX_KOTA[Math.floor(rnd() * PREFIX_KOTA.length)]
        name = `${base} ${c.city.split(' ')[0]} ${suffix === 'Kota' ? '' : suffix}`.trim().replace(/\s+/g, ' ')
      } else {
        const base = UMUM_NAMES[Math.floor(rnd() * UMUM_NAMES.length)].trim()
        name = `${base} ${c.city.split(' ')[0]}`
      }
      if (list.some((b) => b.name === name)) name = `${name} ${no}`

      // sebar dalam radius ~5.5 km dari pusat kota
      const ang = rnd() * Math.PI * 2
      const rad = 0.006 + rnd() * 0.042
      const lat = c.lat + Math.sin(ang) * rad
      const lng = c.lng + Math.cos(ang) * rad * 1.15

      const openH = 7 + Math.floor(rnd() * 3) // 7-9
      const closeH = 17 + Math.floor(rnd() * 5) // 17-21
      const svcCount = 3 + Math.floor(rnd() * 3)
      const services: string[] = []
      while (services.length < svcCount) {
        const s = SERVICE_POOL[Math.floor(rnd() * SERVICE_POOL.length)]
        if (!services.includes(s)) services.push(s)
      }
      if (isResmi && !services.includes('Servis Berkala')) services[0] = 'Servis Berkala'

      const rating = Math.round((4.1 + rnd() * 0.9) * 10) / 10
      const reviews = 60 + Math.floor(rnd() * 2500)

      list.push({
        id: `bk-${++idc}`,
        name,
        type: isResmi ? 'resmi' : 'umum',
        brand,
        rating,
        reviews,
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        city: c.city,
        province: c.province,
        address: `Jl. ${road} No. ${no}, ${c.city}`,
        hours: `${String(openH).padStart(2, '0')}:00 - ${String(closeH).padStart(2, '0')}:00`,
        phone: `0${c.code}-${1000000 + Math.floor(rnd() * 8999999)}`,
        services,
      })
    }
  })

  return list
}

/** Dataset fallback (hanya Pulau Jawa) — dipakai bila data live tidak tersedia */
export const BENGKEL_LIST: Bengkel[] = generateBengkel()

export const CITY_LIST = CITY_DEFS.map((c) => ({
  city: c.city,
  province: c.province,
  lat: c.lat,
  lng: c.lng,
}))

export function distanceFrom(b: Bengkel, p: LatLng): number {
  return haversineKm(p, { lat: b.lat, lng: b.lng })
}

/** Rute Google Maps dengan koordinat asli */
export function gmapsDirectionUrl(b: Bengkel, from?: LatLng | null): string {
  const dest = `${b.lat},${b.lng}`
  if (from) {
    return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${dest}&travelmode=driving`
  }
  return `https://www.google.com/maps/search/?api=1&query=${dest}`
}
