'use client'

import type { Bengkel } from '@/lib/bengkel'
import { classifyBengkel, isInJava } from '@/lib/bengkel'

/**
 * Data bengkel LIVE dari OpenStreetMap (Overpass API) — diambil langsung
 * oleh browser pengguna sehingga selalu sesuai dengan posisi GPS mereka.
 * Cakupan dibatasi Pulau Jawa. Data Google Places membutuhkan API key
 * berbayar, sementara Overpass gratis & terbuka dengan cakupan setara.
 */

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

const TIMEOUT_MS = 8000

function buildQuery(lat: number, lng: number, radiusM: number, nameFilter?: string): string {
  const nameClause = nameFilter
    ? `["name"~"${nameFilter.replace(/[^a-zA-Z0-9\s]/g, '')}",i]`
    : ''
  return `[out:json][timeout:25];
(
  nwr["shop"="motorcycle_repair"]${nameClause}(around:${Math.round(radiusM)},${lat},${lng});
  nwr["shop"="motorcycle"]${nameClause}(around:${Math.round(radiusM)},${lat},${lng});
  nwr["shop"="car_repair"]${nameClause}(around:${Math.round(radiusM)},${lat},${lng});
);
out center tags 80;`
}

function addrFromTags(t: Record<string, string>): string {
  const parts: string[] = []
  if (t['addr:street']) {
    const street = t['addr:street']
    const no = t['addr:housenumber'] ? ` No. ${t['addr:housenumber']}` : ''
    parts.push(`Jl. ${street.replace(/^jalan\s*/i, '').replace(/^jl\.?\s*/i, '')}${no}`)
  } else if (t['addr:full']) {
    parts.push(t['addr:full'])
  }
  if (t['addr:city']) parts.push(t['addr:city'])
  else if (t['addr:subdistrict']) parts.push(t['addr:subdistrict'])
  return parts.join(', ')
}

function hoursFromTags(t: Record<string, string>): string | undefined {
  const oh = t['opening_hours']
  if (!oh) return undefined
  if (/24\/7/.test(oh)) return '24 Jam'
  // ambil jam pertama "HH:MM-HH:MM" dari format "Mo-Sa 08:00-17:00" dst.
  const m = oh.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  if (m) {
    const p = (s: string) => (s.length === 4 ? `0${s}` : s)
    return `${p(m[1])} - ${p(m[2])}`
  }
  return oh
}

export interface LiveBengkelResult {
  list: Bengkel[]
  endpoint: string
}

async function tryEndpoint(
  endpoint: string,
  query: string,
  signal?: AbortSignal
): Promise<LiveBengkelResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }).toString(),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as {
      elements?: Array<{
        type: string
        id: number
        lat?: number
        lon?: number
        center?: { lat: number; lon: number }
        tags?: Record<string, string>
      }>
    }
    return { list: parseElements(json.elements ?? []), endpoint }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Ambil bengkel nyata di sekitar titik (hanya area Pulau Jawa).
 * Semua mirror Overpass dijalankan PARALEL — hasil tercepat yang dipakai,
 * sehingga lambatnya satu server tidak menghambat tampilan.
 * Melempar error bila semua endpoint gagal.
 */
export async function fetchLiveBengkel(
  lat: number,
  lng: number,
  radiusKm: number,
  opts?: { nameFilter?: string; signal?: AbortSignal }
): Promise<LiveBengkelResult> {
  const query = buildQuery(lat, lng, radiusKm * 1000, opts?.nameFilter)
  const attempts = ENDPOINTS.map((ep) =>
    tryEndpoint(ep, query, opts?.signal).catch((e) => {
      if (opts?.signal?.aborted) throw e
      throw e instanceof Error ? e : new Error(String(e))
    })
  )
  try {
    return await Promise.any(attempts)
  } catch {
    throw new Error('Semua server peta tidak terjangkau')
  }
}

function parseElements(
  elements: Array<{
    type: string
    id: number
    lat?: number
    lon?: number
    center?: { lat: number; lon: number }
    tags?: Record<string, string>
  }>
): Bengkel[] {
  const out: Bengkel[] = []
  const seen = new Set<string>()

  for (const el of elements) {
    const t = el.tags ?? {}
    const name = (t.name ?? t['name:id'] ?? '').trim()
    if (!name) continue

    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (typeof lat !== 'number' || typeof lon !== 'number') continue
    if (!isInJava(lat, lon)) continue // hanya Pulau Jawa

    const key = `${name.toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)

    const { type, brand } = classifyBengkel(name)
    const hours = hoursFromTags(t)
    const phone = t.phone ?? t['contact:phone'] ?? t['contact:mobile']

    out.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      type,
      brand,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lon * 1e6) / 1e6,
      city: t['addr:city'] ?? t['addr:subdistrict'] ?? '',
      province: t['addr:province'] ?? '',
      address: addrFromTags(t) || t.operator || '',
      hours,
      phone: phone || undefined,
      services: [],
      live: true,
    })
  }

  return out
}
