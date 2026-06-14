import { db, skafformMenuItems, skafformNavLocationAssignments } from "./db/index.js"
import { isNotNull } from "drizzle-orm"

type NavItem = {
  id: number
  label: string
  href: string
  visibility: "public" | "guest" | "authenticated" | "admin"
  order: number
  brick: string | null
  target: string | null
}

let cache: Record<string, NavItem[]> | null = null

export function invalidateNavCache() {
  cache = null
}

export async function getNav(): Promise<Record<string, NavItem[]>> {
  if (cache) return cache

  try {
    const assignments = await db.select().from(skafformNavLocationAssignments)
    const items = await db
      .select()
      .from(skafformMenuItems)
      .where(isNotNull(skafformMenuItems.menuId))

    const menuIdToLocation: Record<number, string> = {}
    for (const a of assignments) menuIdToLocation[a.menuId] = a.location

    const registry: Record<string, NavItem[]> = {}
    for (const a of assignments) registry[a.location] = []

    for (const item of items) {
      const location = item.menuId ? menuIdToLocation[item.menuId] : null
      if (location && registry[location]) {
        registry[location].push({
          id: item.id,
          label: item.label,
          href: item.href,
          visibility: item.visibility,
          order: item.order,
          brick: item.brick,
          target: item.target,
        })
      }
    }

    for (const loc of Object.keys(registry)) {
      registry[loc].sort((a, b) => a.order - b.order)
    }

    cache = registry
    return cache
  } catch {
    return {}
  }
}
