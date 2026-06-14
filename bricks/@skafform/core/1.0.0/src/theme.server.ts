import { db, skafformThemeSettings } from "./db/index.js"

let cache: Record<string, string> | null = null

export function invalidateThemeCache() {
  cache = null
}

export async function getThemeOverrides(): Promise<Record<string, string>> {
  if (cache) return cache
  try {
    const rows = await db.select().from(skafformThemeSettings)
    cache = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return cache
  } catch {
    return {}
  }
}
