import { redirect } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { getAdapter } from "@skafform/core/runtime"
import { db, skafformCustomizeSettings } from "@skafform/core/db"
import { invalidateCustomizeCache } from "@skafform/core/customize"
import { eq } from "drizzle-orm"

type SchemaField = {
  type: "text" | "color" | "textarea"
  label: string
  group: string
}

function readJson(path: string) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null
}

function getThemeData(cwd: string) {
  const config = readJson(resolve(cwd, "skafform.config.json"))
  const theme = config?.theme ?? "theme-light"
  const themeJson = readJson(resolve(cwd, `themes/${theme}/child/theme.json`))
  return { theme, themeJson }
}

function getDefaultValue(themeJson: any, key: string): string {
  const parts = key.split(".")
  let cur = themeJson?.customize ?? {}
  for (const part of parts) {
    if (cur == null) return ""
    cur = cur[part]
  }
  return cur ?? ""
}

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")

  const cwd = process.cwd()
  const { theme, themeJson } = getThemeData(cwd)
  const schema: Record<string, SchemaField> = themeJson?.customize_schema ?? {}

  const overrideRows = await db.select().from(skafformCustomizeSettings)
  const overrides: Record<string, string> = Object.fromEntries(overrideRows.map(r => [r.key, r.value]))

  return { schema, overrides, theme, themeJson }
}

export async function action({ request }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const formData = await request.formData()

  const resetKey = formData.get("_reset") as string | null
  if (resetKey) {
    await db.delete(skafformCustomizeSettings).where(eq(skafformCustomizeSettings.key, resetKey))
    invalidateCustomizeCache()
    return redirect("/admin/customize")
  }

  const cwd = process.cwd()
  const { themeJson } = getThemeData(cwd)
  const schema: Record<string, SchemaField> = themeJson?.customize_schema ?? {}

  const updates: Promise<unknown>[] = []

  for (const key of Object.keys(schema)) {
    const value = (formData.get(key) as string ?? "").trim()
    const defaultVal = String(getDefaultValue(themeJson, key))

    if (value === "" || value === defaultVal) {
      updates.push(db.delete(skafformCustomizeSettings).where(eq(skafformCustomizeSettings.key, key)))
    } else {
      updates.push(
        db.insert(skafformCustomizeSettings)
          .values({ key, value })
          .onConflictDoUpdate({ target: skafformCustomizeSettings.key, set: { value } })
      )
    }
  }

  await Promise.all(updates)
  invalidateCustomizeCache()
  return redirect("/admin/customize")
}

type LoaderData = {
  schema: Record<string, SchemaField>
  overrides: Record<string, string>
  theme: string
  themeJson: any
}

export default function AdminCustomizePage({ loaderData }: { loaderData: LoaderData }) {
  const { schema, overrides, theme, themeJson } = loaderData

  const groups: Record<string, Array<{ key: string; field: SchemaField }>> = {}
  for (const [key, field] of Object.entries(schema)) {
    const g = field.group ?? "Général"
    if (!groups[g]) groups[g] = []
    groups[g].push({ key, field })
  }

  const modifiedCount = Object.keys(overrides).length

  return (
    <div style={{ minHeight: "100vh", background: "var(--skafform-muted)" }}>

      {/* Sticky header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--skafform-background)",
        borderBottom: "1px solid var(--skafform-border)",
        boxShadow: "var(--skafform-shadow-sm)",
        padding: "0 var(--skafform-spacing-xl)",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-md)" }}>
          <h1 style={{
            fontSize: "var(--skafform-font-size-lg)",
            fontWeight: 700,
            color: "var(--skafform-foreground)",
            fontFamily: "var(--skafform-font-heading)",
            margin: 0,
          }}>
            Personnalisation
          </h1>
          <span style={{
            fontSize: "var(--skafform-font-size-xs)",
            color: "var(--skafform-muted-fg)",
            fontFamily: "monospace",
            background: "var(--skafform-muted)",
            padding: "2px 8px",
            borderRadius: "var(--skafform-radius-sm)",
          }}>
            {theme}
          </span>
          {modifiedCount > 0 && (
            <span style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-primary)", fontWeight: 500 }}>
              ● {modifiedCount} modifié{modifiedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <button type="submit" form="customize-form" style={{
            padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
            background: "var(--skafform-primary)",
            color: "var(--skafform-primary-fg)",
            border: "none",
            borderRadius: "var(--skafform-radius)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "var(--skafform-font-size-sm)",
          }}>
            Sauvegarder
          </button>
      </div>

      {/* Content */}
      <form id="customize-form" method="post">
        <div style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "var(--skafform-spacing-xl) var(--skafform-spacing-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--skafform-spacing-md)",
        }}>
          {Object.entries(groups).map(([groupLabel, fields]) => (
            <div key={groupLabel} style={{
              background: "var(--skafform-background)",
              border: "1px solid var(--skafform-border)",
              borderRadius: "var(--skafform-radius-lg)",
              boxShadow: "var(--skafform-shadow-sm)",
              padding: "var(--skafform-spacing-xl)",
            }}>
              <p style={{
                fontSize: "var(--skafform-font-size-xs)",
                fontWeight: 600,
                color: "var(--skafform-muted-fg)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 var(--skafform-spacing-lg) 0",
              }}>
                {groupLabel}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-lg)" }}>
                {fields.map(({ key, field }) => {
                  const defaultVal = String(getDefaultValue(themeJson, key))
                  const currentVal = overrides[key] ?? defaultVal
                  const overridden = key in overrides

                  return (
                    <div key={key}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "var(--skafform-spacing-xs)",
                      }}>
                        <label htmlFor={key} style={{
                          fontSize: "var(--skafform-font-size-sm)",
                          fontWeight: 500,
                          color: "var(--skafform-foreground)",
                        }}>
                          {field.label}
                        </label>

                        {overridden && (
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-sm)" }}>
                            <span style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-primary)", fontWeight: 500 }}>
                              ● modifié
                            </span>
                            <form method="post" style={{ display: "contents" }}>
                              <input type="hidden" name="_reset" value={key} />
                              <button type="submit" title={`Remettre : ${defaultVal}`} style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--skafform-muted-fg)",
                                fontSize: "var(--skafform-font-size-xs)",
                                padding: 0,
                              }}>
                                ↺ défaut
                              </button>
                            </form>
                          </div>
                        )}
                      </div>

                      {field.type === "textarea" ? (
                        <textarea id={key} name={key} defaultValue={currentVal} rows={3} style={{
                          width: "100%",
                          padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)",
                          border: `1px solid ${overridden ? "var(--skafform-primary)" : "var(--skafform-border)"}`,
                          borderRadius: "var(--skafform-radius)",
                          background: overridden ? "color-mix(in srgb, var(--skafform-primary) 4%, var(--skafform-background))" : "var(--skafform-background)",
                          color: "var(--skafform-foreground)",
                          fontSize: "var(--skafform-font-size-sm)",
                          fontFamily: "var(--skafform-font)",
                          resize: "vertical",
                          boxSizing: "border-box",
                          outline: "none",
                        }} />
                      ) : (
                        <input id={key} type="text" name={key} defaultValue={currentVal} style={{
                          width: "100%",
                          padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)",
                          border: `1px solid ${overridden ? "var(--skafform-primary)" : "var(--skafform-border)"}`,
                          borderRadius: "var(--skafform-radius)",
                          background: overridden ? "color-mix(in srgb, var(--skafform-primary) 4%, var(--skafform-background))" : "var(--skafform-background)",
                          color: "var(--skafform-foreground)",
                          fontSize: "var(--skafform-font-size-sm)",
                          boxSizing: "border-box",
                          outline: "none",
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </form>
    </div>
  )
}
