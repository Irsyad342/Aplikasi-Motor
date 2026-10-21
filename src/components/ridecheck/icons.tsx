'use client'

import {
  BatteryCharging,
  CircleDot,
  Disc3,
  Droplet,
  Droplets,
  Filter,
  Fuel,
  GlassWater,
  Link,
  Link2,
  Spline,
  Waves,
  Wind,
  Donut,
  Zap,
  Cog,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  droplets: Droplets,
  droplet: Droplet,
  filter: Filter,
  wind: Wind,
  zap: Zap,
  'circle-dot': CircleDot,
  'disc-3': Disc3,
  'glass-water': GlassWater,
  fuel: Fuel,
  waves: Waves,
  spline: Spline,
  donut: Donut,
  'battery-charging': BatteryCharging,
  'link-2': Link2,
  link: Link,
  cog: Cog,
  wrench: Wrench,
}

export function ComponentIcon({
  icon,
  className,
  size = 24,
}: {
  icon: string
  className?: string
  size?: number
}) {
  const Icon = ICONS[icon] ?? Cog
  return <Icon className={className} size={size} />
}
