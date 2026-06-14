import { redirect } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { getAdapter } from "@skafform/core/runtime"
import { db, skafformMenus, skafformMenuItems, skafformNavLocationAssignments } from "@skafform/core/db"
import { invalidateNavCache } from "@skafform/core/nav"
import { eq } from "drizzle-orm"

type NavLocation = { slug: string; label: string }
type SeedItem = {
  key?: string
  brick: string
  label: string
  href: string
  visibility: "public" | "guest" | "authenticated" | "admin"
  order: number
  locationDefault: string
}

function readJson(path: string) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null
}

function getNavLocations(cwd: string): NavLocation[] {
  const config = readJson(resolve(cwd, "skafform.config.json"))
  const theme = config?.theme ?? "theme-light"
  const themeJson = readJson(resolve(cwd, `themes/${theme}/child/theme.json`))
  return Object.entries(themeJson?.nav_locations ?? {}).map(([slug, label]) => ({
    slug,
    label: label as string,
  }))
}

function getBrickNavItems(cwd: string): SeedItem[] {
  const bricksConfig = readJson(resolve(cwd, "skafform-bricks.json"))
  const items: SeedItem[] = []
  for (const brickName of Object.keys(bricksConfig?.bricks ?? {})) {
    const pkg = readJson(resolve(cwd, "bricks", brickName, "package.json"))
    for (const item of pkg?.skafform?.nav ?? []) {
      items.push({
        key: item.key,
        brick: brickName,
        label: item.label,
        href: item.href,
        visibility: item.visibility,
        order: item.order ?? 0,
        locationDefault: item.location,
      })
    }
  }
  return items
}

async function seedIfEmpty(locations: NavLocation[], brickItems: SeedItem[]) {
  const existing = await db.select().from(skafformMenus).limit(1)
  if (existing.length > 0) return

  const validSlugs = new Set(locations.map(l => l.slug))
  const locationToMenuId: Record<string, number> = {}

  for (const loc of locations) {
    const [menu] = await db
      .insert(skafformMenus)
      .values({ name: loc.label, slug: loc.slug })
      .returning()

    await db
      .insert(skafformNavLocationAssignments)
      .values({ location: loc.slug, menuId: menu.id })

    locationToMenuId[loc.slug] = menu.id
  }

  for (const item of brickItems) {
    const menuId = validSlugs.has(item.locationDefault)
      ? locationToMenuId[item.locationDefault]
      : null

    await db.insert(skafformMenuItems).values({
      menuId,
      key: item.key,
      label: item.label,
      href: item.href,
      visibility: item.visibility,
      order: item.order,
      brick: item.brick,
    })
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")

  const cwd = process.cwd()
  const locations = getNavLocations(cwd)
  const brickItems = getBrickNavItems(cwd)

  await seedIfEmpty(locations, brickItems)

  const menus = await db.select().from(skafformMenus)
  const menuItems = await db.select().from(skafformMenuItems)
  const assignments = await db.select().from(skafformNavLocationAssignments)

  const menuIdToLocation: Record<number, string> = {}
  for (const a of assignments) menuIdToLocation[a.menuId] = a.location

  const itemsWithLocation = menuItems.map(item => ({
    ...item,
    locationSlug: menuIdToLocation[item.menuId] ?? null,
  }))

  return { locations, itemsWithLocation }
}

export async function action({ request }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const formData = await request.formData()
  const assignments = await db.select().from(skafformNavLocationAssignments)
  const locationToMenuId: Record<string, number> = {}
  for (const a of assignments) locationToMenuId[a.location] = a.menuId

  const updates: Promise<unknown>[] = []
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("item_")) continue
    const itemId = parseInt(key.replace("item_", ""))
    const locationSlug = value as string
    const menuId = locationSlug === "" ? null : (locationToMenuId[locationSlug] ?? null)
    updates.push(
      db.update(skafformMenuItems).set({ menuId }).where(eq(skafformMenuItems.id, itemId))
    )
  }

  await Promise.all(updates)
  invalidateNavCache()
  return redirect("/admin/navigation")
}

type ItemWithLocation = {
  id: number
  label: string
  href: string
  visibility: string
  order: number
  brick: string | null
  locationSlug: string | null
}

export default function AdminNavigationPage({ loaderData }: {
  loaderData: { locations: NavLocation[]; itemsWithLocation: ItemWithLocation[] }
}) {
  const { locations, itemsWithLocation } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Navigation
      </h1>

      <form method="post">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Label", "URL", "Brick", "Visibilité", "Emplacement"].map(h => (
                <th key={h} style={{
                  textAlign: "left",
                  color: "var(--skafform-muted-fg)",
                  padding: "var(--skafform-spacing-sm)",
                  borderBottom: "1px solid var(--skafform-border)",
                  fontSize: "var(--skafform-font-size-sm)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itemsWithLocation.map(item => (
              <tr key={item.id}>
                <td style={cellStyle}>{item.label}</td>
                <td style={{ ...cellStyle, color: "var(--skafform-muted-fg)", fontFamily: "monospace" }}>
                  {item.href}
                </td>
                <td style={{ ...cellStyle, color: "var(--skafform-muted-fg)" }}>
                  {item.brick ?? "—"}
                </td>
                <td style={{ ...cellStyle, color: "var(--skafform-muted-fg)" }}>
                  {item.visibility}
                </td>
                <td style={cellStyle}>
                  <select
                    name={`item_${item.id}`}
                    defaultValue={item.locationSlug ?? ""}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "var(--skafform-radius-sm)",
                      border: "1px solid var(--skafform-border)",
                      background: "var(--skafform-background)",
                      color: "var(--skafform-foreground)",
                      fontSize: "var(--skafform-font-size-sm)",
                    }}
                  >
                    <option value="">— Non assigné —</option>
                    {locations.map(loc => (
                      <option key={loc.slug} value={loc.slug}>{loc.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "var(--skafform-spacing-lg)" }}>
          <button
            type="submit"
            style={{
              padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
              background: "var(--skafform-primary)",
              color: "var(--skafform-primary-fg)",
              border: "none",
              borderRadius: "var(--skafform-radius)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "var(--skafform-font-size-sm)",
            }}
          >
            Sauvegarder
          </button>
        </div>
      </form>
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-sm)",
  borderBottom: "1px solid var(--skafform-border)",
  color: "var(--skafform-foreground)",
  fontSize: "var(--skafform-font-size-sm)",
}
