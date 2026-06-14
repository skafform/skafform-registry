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

  const url = new URL(request.url)
  const prefillLabel = url.searchParams.get("label") ?? ""
  const prefillHref  = url.searchParams.get("href") ?? ""

  return { locations, itemsWithLocation, prefillLabel, prefillHref }
}

export async function action({ request }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const formData = await request.formData()
  const assignments = await db.select().from(skafformNavLocationAssignments)
  const locationToMenuId: Record<string, number> = {}
  for (const a of assignments) locationToMenuId[a.location] = a.menuId

  // Suppression d'un item custom
  if (formData.get("_action") === "delete_item") {
    const id = Number(formData.get("id"))
    if (id) {
      await db.delete(skafformMenuItems)
        .where(eq(skafformMenuItems.id, id))
    }
    invalidateNavCache()
    return redirect("/admin/navigation")
  }

  // Ajout d'un nouvel item
  if (formData.get("_action") === "add_item") {
    const label      = (formData.get("label") as string ?? "").trim()
    const href       = (formData.get("href") as string ?? "").trim()
    const locationSlug = formData.get("location") as string ?? ""
    const menuId = locationSlug === "" ? null : (locationToMenuId[locationSlug] ?? null)
    if (label && href) {
      await db.insert(skafformMenuItems).values({
        label,
        href,
        visibility: "public",
        order: 0,
        menuId,
        brick: null,
        key: null,
      })
    }
    invalidateNavCache()
    return redirect("/admin/navigation")
  }

  // Mise à jour des assignations existantes
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
  loaderData: { locations: NavLocation[]; itemsWithLocation: ItemWithLocation[]; prefillLabel: string; prefillHref: string }
}) {
  const { locations, itemsWithLocation, prefillLabel, prefillHref } = loaderData

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

      {/* Formulaire ajout d'item */}
      <form method="post" style={{
        background: "var(--skafform-muted)",
        border: "1px solid var(--skafform-border)",
        borderRadius: "var(--skafform-radius-lg)",
        padding: "var(--skafform-spacing-lg)",
        marginBottom: "var(--skafform-spacing-xl)",
        display: "flex",
        gap: "var(--skafform-spacing-md)",
        alignItems: "flex-end",
        flexWrap: "wrap",
      }}>
        <input type="hidden" name="_action" value="add_item" />
        <div>
          <label style={addLabelStyle}>Label</label>
          <input name="label" type="text" defaultValue={prefillLabel} placeholder="Pricing" required style={addInputStyle} />
        </div>
        <div>
          <label style={addLabelStyle}>URL</label>
          <input name="href" type="text" defaultValue={prefillHref} placeholder="/pricing" required style={addInputStyle} />
        </div>
        <div>
          <label style={addLabelStyle}>Emplacement</label>
          <select name="location" style={addInputStyle}>
            <option value="">— Non assigné —</option>
            {locations.map(loc => (
              <option key={loc.slug} value={loc.slug}>{loc.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" style={{
          padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
          background: "var(--skafform-primary)",
          color: "var(--skafform-primary-fg)",
          border: "none",
          borderRadius: "var(--skafform-radius)",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "var(--skafform-font-size-sm)",
          whiteSpace: "nowrap",
        }}>
          + Ajouter
        </button>
      </form>

      <form method="post">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Label", "URL", "Brick", "Visibilité", "Emplacement", ""].map(h => (
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
                <td style={cellStyle}>
                  {item.brick === null && (
                    <form method="post" style={{ display: "contents" }}>
                      <input type="hidden" name="_action" value="delete_item" />
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--skafform-muted-fg)", fontSize: "var(--skafform-font-size-xs)", padding: 0 }}
                        onClick={e => { if (!confirm(`Supprimer "${item.label}" ?`)) e.preventDefault() }}
                      >
                        Supprimer
                      </button>
                    </form>
                  )}
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

const addLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--skafform-font-size-xs)",
  fontWeight: 600,
  color: "var(--skafform-muted-fg)",
  marginBottom: "4px",
}

const addInputStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)",
  border: "1px solid var(--skafform-border)",
  borderRadius: "var(--skafform-radius)",
  background: "var(--skafform-background)",
  color: "var(--skafform-foreground)",
  fontSize: "var(--skafform-font-size-sm)",
  outline: "none",
}

const cellStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-sm)",
  borderBottom: "1px solid var(--skafform-border)",
  color: "var(--skafform-foreground)",
  fontSize: "var(--skafform-font-size-sm)",
}
