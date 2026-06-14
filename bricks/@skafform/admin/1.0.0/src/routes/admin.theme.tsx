import { redirect } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { getAdapter } from "@skafform/core/runtime"
import { db, skafformThemeSettings } from "@skafform/core/db"
import { invalidateThemeCache } from "@skafform/core/theme"
import { eq } from "drizzle-orm"

const TOKEN_GROUPS = [
  {
    label: "Couleurs",
    keys: [
      "--skafform-primary", "--skafform-primary-fg", "--skafform-primary-hover",
      "--skafform-background", "--skafform-foreground",
      "--skafform-muted", "--skafform-muted-fg",
      "--skafform-border", "--skafform-error",
    ],
  },
  {
    label: "Typographie",
    keys: ["--skafform-font", "--skafform-font-heading", "--skafform-font-body"],
  },
  {
    label: "Tailles de police",
    keys: [
      "--skafform-font-size-xs", "--skafform-font-size-sm", "--skafform-font-size-base",
      "--skafform-font-size-lg", "--skafform-font-size-xl", "--skafform-font-size-2xl",
    ],
  },
  {
    label: "Espacement",
    keys: [
      "--skafform-spacing-xs", "--skafform-spacing-sm", "--skafform-spacing-md",
      "--skafform-spacing-lg", "--skafform-spacing-xl",
    ],
  },
  {
    label: "Bordures",
    keys: ["--skafform-radius", "--skafform-radius-sm", "--skafform-radius-md", "--skafform-radius-lg"],
  },
  {
    label: "Ombres",
    keys: ["--skafform-shadow-sm", "--skafform-shadow-md", "--skafform-shadow-lg"],
  },
  {
    label: "Layout",
    keys: ["--skafform-navbar-height"],
  },
]

function readJson(path: string) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null
}

function getDefaults(cwd: string): Record<string, string> {
  const config = readJson(resolve(cwd, "skafform.config.json"))
  const theme = config?.theme ?? "theme-light"
  const themeJson = readJson(resolve(cwd, `themes/${theme}/child/theme.json`))
  const defaults: Record<string, string> = {}
  for (const [k, v] of Object.entries(themeJson?.tokens ?? {})) {
    defaults[`--skafform-${k}`] = v as string
  }
  return defaults
}

function isColor(value: string) {
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim())
}

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")

  const cwd = process.cwd()
  const config = readJson(resolve(cwd, "skafform.config.json"))
  const activeTheme = config?.theme ?? "theme-light"
  const defaults = getDefaults(cwd)

  const overrideRows = await db.select().from(skafformThemeSettings)
  const overrides: Record<string, string> = Object.fromEntries(overrideRows.map(r => [r.key, r.value]))

  return { defaults, overrides, activeTheme }
}

export async function action({ request }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const formData = await request.formData()

  const resetKey = formData.get("_reset") as string | null
  if (resetKey) {
    await db.delete(skafformThemeSettings).where(eq(skafformThemeSettings.key, resetKey))
    invalidateThemeCache()
    return redirect("/admin/theme")
  }

  const defaults = getDefaults(process.cwd())

  const updates: Promise<unknown>[] = []

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("--skafform-")) continue
    const strValue = (value as string).trim()
    if (strValue === "" || strValue === defaults[key]) {
      updates.push(db.delete(skafformThemeSettings).where(eq(skafformThemeSettings.key, key)))
    } else {
      updates.push(
        db.insert(skafformThemeSettings)
          .values({ key, value: strValue })
          .onConflictDoUpdate({ target: skafformThemeSettings.key, set: { value: strValue } })
      )
    }
  }

  await Promise.all(updates)
  invalidateThemeCache()
  return redirect("/admin/theme")
}

type LoaderData = {
  defaults: Record<string, string>
  overrides: Record<string, string>
  activeTheme: string
}

export default function AdminThemePage({ loaderData }: { loaderData: LoaderData }) {
  const { defaults, overrides, activeTheme } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--skafform-spacing-md)", marginBottom: "var(--skafform-spacing-lg)" }}>
        <h1 style={{
          fontSize: "var(--skafform-font-size-2xl)",
          fontWeight: 700,
          color: "var(--skafform-foreground)",
          fontFamily: "var(--skafform-font-heading)",
          margin: 0,
        }}>
          Thème
        </h1>
        <span style={{
          fontSize: "var(--skafform-font-size-sm)",
          color: "var(--skafform-muted-fg)",
          fontFamily: "monospace",
        }}>
          {activeTheme}
        </span>
      </div>

      <form method="post">
        {TOKEN_GROUPS.map(group => {
          const groupKeys = group.keys.filter(k => k in defaults)
          if (groupKeys.length === 0) return null
          return (
            <section key={group.label} style={{ marginBottom: "var(--skafform-spacing-xl)" }}>
              <h2 style={{
                fontSize: "var(--skafform-font-size-sm)",
                fontWeight: 600,
                color: "var(--skafform-muted-fg)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "var(--skafform-spacing-sm)",
                paddingBottom: "var(--skafform-spacing-xs)",
                borderBottom: "1px solid var(--skafform-border)",
              }}>
                {group.label}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
                {groupKeys.map(key => {
                  const defaultVal = defaults[key]
                  const currentVal = overrides[key] ?? defaultVal
                  const overridden = key in overrides
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-md)", padding: "var(--skafform-spacing-xs) 0" }}>
                      <label
                        htmlFor={key}
                        style={{
                          width: "260px",
                          flexShrink: 0,
                          fontFamily: "monospace",
                          fontSize: "var(--skafform-font-size-xs)",
                          color: overridden ? "var(--skafform-foreground)" : "var(--skafform-muted-fg)",
                          fontWeight: overridden ? 600 : 400,
                        }}
                      >
                        {key}
                      </label>

                      {isColor(defaultVal) ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-sm)" }}>
                          <input
                            id={key}
                            type="color"
                            name={key}
                            defaultValue={isColor(currentVal) ? currentVal : defaultVal}
                            style={{ width: "40px", height: "32px", padding: "2px", border: "1px solid var(--skafform-border)", borderRadius: "var(--skafform-radius-sm)", cursor: "pointer" }}
                          />
                          <input
                            type="text"
                            value={currentVal}
                            readOnly
                            style={{
                              width: "90px",
                              padding: "4px 8px",
                              fontFamily: "monospace",
                              fontSize: "var(--skafform-font-size-xs)",
                              border: "1px solid var(--skafform-border)",
                              borderRadius: "var(--skafform-radius-sm)",
                              background: "var(--skafform-muted)",
                              color: "var(--skafform-muted-fg)",
                            }}
                          />
                        </div>
                      ) : (
                        <input
                          id={key}
                          type="text"
                          name={key}
                          defaultValue={currentVal}
                          style={{
                            width: "320px",
                            padding: "4px 8px",
                            fontFamily: "monospace",
                            fontSize: "var(--skafform-font-size-xs)",
                            border: "1px solid var(--skafform-border)",
                            borderRadius: "var(--skafform-radius-sm)",
                            background: "var(--skafform-background)",
                            color: "var(--skafform-foreground)",
                          }}
                        />
                      )}

                      {overridden && (
                        <>
                          <span style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)" }}>
                            défaut: <code style={{ fontFamily: "monospace" }}>{defaultVal}</code>
                          </span>
                          <form method="post" style={{ display: "inline" }}>
                            <input type="hidden" name="_reset" value={key} />
                            <button
                              type="submit"
                              title="Remettre la valeur par défaut"
                              style={{
                                background: "none",
                                border: "1px solid var(--skafform-border)",
                                borderRadius: "var(--skafform-radius-sm)",
                                cursor: "pointer",
                                color: "var(--skafform-muted-fg)",
                                fontSize: "var(--skafform-font-size-xs)",
                                padding: "2px 6px",
                                lineHeight: 1,
                              }}
                            >
                              ↺
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        <div style={{ display: "flex", gap: "var(--skafform-spacing-md)", marginTop: "var(--skafform-spacing-lg)" }}>
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
