import { db, skafformCustomizeSettings } from "./db/index.js"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

let cache: Record<string, any> | null = null

export function invalidateCustomizeCache() {
  cache = null
}

function readThemeDefaults(cwd: string): Record<string, any> {
  const configPath = resolve(cwd, "skafform.config.json")
  if (!existsSync(configPath)) return {}
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const theme = config?.theme ?? "theme-light"
  const themeJsonPath = resolve(cwd, `themes/${theme}/child/theme.json`)
  if (!existsSync(themeJsonPath)) return {}
  return JSON.parse(readFileSync(themeJsonPath, "utf-8"))?.customize ?? {}
}

function setDeepValue(obj: Record<string, any>, path: string, value: string) {
  const parts = path.split(".")
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {}
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
}

export async function getCustomize(): Promise<Record<string, any>> {
  if (cache) return cache
  try {
    const defaults = readThemeDefaults(process.cwd())
    const result: Record<string, any> = JSON.parse(JSON.stringify(defaults))
    const rows = await db.select().from(skafformCustomizeSettings)
    for (const row of rows) {
      setDeepValue(result, row.key, row.value)
    }
    cache = result
    return cache
  } catch {
    return {}
  }
}
