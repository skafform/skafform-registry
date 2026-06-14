import { redirect } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { Link } from "react-router"
import { getAdapter } from "@skafform/core/runtime"
import { db, skafformPages } from "@skafform/core/db"
import { eq } from "drizzle-orm"

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")

  const pages = await db.select().from(skafformPages).orderBy(skafformPages.id)
  return { pages }
}

export async function action({ request }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const formData = await request.formData()
  const id = Number(formData.get("_delete"))
  if (id) {
    await db.delete(skafformPages).where(eq(skafformPages.id, id))
  }
  return redirect("/admin/pages")
}

type Page = { id: number; slug: string; title: string; template: string; status: string }

export default function AdminPagesPage({ loaderData }: { loaderData: { pages: Page[] } }) {
  const { pages } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--skafform-spacing-xl)" }}>
        <h1 style={{ fontSize: "var(--skafform-font-size-2xl)", fontWeight: 700, color: "var(--skafform-foreground)", fontFamily: "var(--skafform-font-heading)", margin: 0 }}>
          Pages
        </h1>
        <Link to="/admin/pages/new" style={{
          padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
          background: "var(--skafform-primary)",
          color: "var(--skafform-primary-fg)",
          borderRadius: "var(--skafform-radius)",
          textDecoration: "none",
          fontSize: "var(--skafform-font-size-sm)",
          fontWeight: 600,
        }}>
          + Nouvelle page
        </Link>
      </div>

      {pages.length === 0 ? (
        <div style={{
          padding: "var(--skafform-spacing-xl)",
          textAlign: "center",
          color: "var(--skafform-muted-fg)",
          border: "1px dashed var(--skafform-border)",
          borderRadius: "var(--skafform-radius-lg)",
        }}>
          Aucune page. <Link to="/admin/pages/new" style={{ color: "var(--skafform-primary)" }}>Créer la première</Link>.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-sm)" }}>
          {pages.map(page => (
            <div key={page.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--skafform-spacing-md)",
              padding: "var(--skafform-spacing-md) var(--skafform-spacing-lg)",
              background: "var(--skafform-background)",
              border: "1px solid var(--skafform-border)",
              borderRadius: "var(--skafform-radius)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--skafform-foreground)", fontSize: "var(--skafform-font-size-sm)" }}>
                  {page.title}
                </div>
                <div style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)", fontFamily: "monospace" }}>
                  /{page.slug}
                </div>
              </div>

              <span style={{
                fontSize: "var(--skafform-font-size-xs)",
                color: "var(--skafform-muted-fg)",
                fontFamily: "monospace",
              }}>
                {page.template}
              </span>

              <span style={{
                fontSize: "var(--skafform-font-size-xs)",
                fontWeight: 600,
                color: page.status === "published" ? "var(--skafform-primary)" : "var(--skafform-muted-fg)",
              }}>
                {page.status === "published" ? "● Publié" : "○ Brouillon"}
              </span>

              <Link to={`/admin/pages/${page.id}/edit`} style={{
                fontSize: "var(--skafform-font-size-xs)",
                color: "var(--skafform-primary)",
                textDecoration: "none",
                fontWeight: 500,
              }}>
                Modifier
              </Link>

              {page.status === "published" && (
                <Link
                  to={`/admin/navigation?label=${encodeURIComponent(page.title)}&href=${encodeURIComponent("/" + page.slug)}`}
                  style={{
                    fontSize: "var(--skafform-font-size-xs)",
                    color: "var(--skafform-muted-fg)",
                    textDecoration: "none",
                  }}
                >
                  + Nav
                </Link>
              )}

              <form method="post" style={{ display: "contents" }}>
                <input type="hidden" name="_delete" value={page.id} />
                <button type="submit" style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--skafform-muted-fg)",
                  fontSize: "var(--skafform-font-size-xs)",
                  padding: 0,
                }}
                onClick={e => { if (!confirm(`Supprimer "${page.title}" ?`)) e.preventDefault() }}>
                  Supprimer
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
