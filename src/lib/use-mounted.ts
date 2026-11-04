'use client'

import { useSyncExternalStore } from 'react'

/**
 * useMounted — guard hydrasi tanpa effect.
 * false saat render server/hydrasi, true setelah klien sepenuhnya mount.
 * (Pola sama dengan yang dipakai settings-view.)
 */
const emptySubscribe = () => () => {}

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
