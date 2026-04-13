import type { StorageSchema } from '../types'

export function storageGet<K extends keyof StorageSchema>(
  key: K,
  fallback: StorageSchema[K],
): StorageSchema[K] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as StorageSchema[K]) : fallback
  } catch {
    return fallback
  }
}

export function storageSet<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function storageClear(): void {
  const keys: (keyof StorageSchema)[] = [
    'dt:profile', 'dt:fasting', 'dt:settings', 'dt:weights', 'dt:days',
  ]
  keys.forEach(k => localStorage.removeItem(k))
}

export function exportData(): string {
  const data: Partial<StorageSchema> = {}
  const keys: (keyof StorageSchema)[] = [
    'dt:profile', 'dt:fasting', 'dt:settings', 'dt:weights', 'dt:days',
  ]
  keys.forEach(k => {
    const raw = localStorage.getItem(k)
    if (raw) (data as Record<string, unknown>)[k] = JSON.parse(raw)
  })
  return JSON.stringify(data, null, 2)
}

export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json) as Record<string, unknown>
    Object.entries(data).forEach(([k, v]) => {
      localStorage.setItem(k, JSON.stringify(v))
    })
    return true
  } catch {
    return false
  }
}
