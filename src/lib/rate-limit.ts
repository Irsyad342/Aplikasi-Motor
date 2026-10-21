/**
 * Rate limiter sederhana berbasis memori (sliding window per jendela tetap).
 *
 * Catatan serverless: setiap instance memori tersendiri, sehingga batas ini
 * bersifat per-instance (best-effort). Untuk skala besar, gunakan Upstash
 * Redis / Vercel WAF. Sesuai kebutuhan proyek: tanpa middleware tambahan.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Batasi jumlah key untuk mencegah kehabisan memori (memory exhaustion)
const MAX_BUCKETS = 10_000

// Kebijakan default: 120 request per menit per IP
const WINDOW_MS = 60_000

export type RateLimitTier = 'read' | 'write' | 'sensitive'

const TIER_LIMITS: Record<RateLimitTier, number> = {
  read: 240,
  write: 60,
  sensitive: 5,
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

export function rateLimit(
  req: Request,
  tier: RateLimitTier = 'write',
  scope = 'global'
): RateLimitResult {
  const key = `${scope}:${tier}:${clientIp(req)}`
  const now = Date.now()

  // Bersihkan bucket kedaluwarsa secara periodik saat peta penuh
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
      if (buckets.size < MAX_BUCKETS) break
    }
    if (buckets.size >= MAX_BUCKETS) buckets.clear()
  }

  const bucket = buckets.get(key)
  const limit = TIER_LIMITS[tier]

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 }
}
