import { redirect, data } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { getAdapter } from "@skafform/core/runtime"
import { getMetaKeys, createMetaKey, updateMetaKey, deleteMetaKey } from "../db/meta.js"
import type { MetaKey } from "../db/meta.js"

const META_TYPES = ["text", "textarea", "tel", "url", "date"]

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user || user.role !== "admin") return redirect("/")
  const metaKeys = await getMetaKeys()
  return { metaKeys }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user || user.role !== "admin") return redirect("/")

  const form = await request.formData()
  const intent = form.get("intent")?.toString()

  if (intent === "create") {
    const metaKeyName = form.get("metaKeyName")?.toString().trim() ?? ""
    const label       = form.get("label")?.toString().trim() ?? ""
    const type        = form.get("type")?.toString() ?? "text"
    const required    = form.get("required") === "on"
    const order       = parseInt(form.get("order")?.toString() ?? "0", 10)

    if (!metaKeyName || !label) return data({ error: "Nom et label sont requis." }, { status: 400 })

    await createMetaKey({ metaKeyName, label, type, required, order })
  }

  if (intent === "delete") {
    const id = form.get("id")?.toString() ?? ""
    if (id) await deleteMetaKey(id)
  }

  if (intent === "update") {
    const id      = form.get("id")?.toString() ?? ""
    const label   = form.get("label")?.toString().trim()
    const type    = form.get("type")?.toString()
    const required = form.get("required") === "on"
    const order   = parseInt(form.get("order")?.toString() ?? "0", 10)
    if (id) await updateMetaKey(id, { label, type, required, order })
  }

  return redirect("/admin/meta-keys")
}

export default function MetaKeysPage({ loaderData, actionData }: {
  loaderData: { metaKeys: MetaKey[] }
  actionData?: { error?: string }
}) {
  const { metaKeys } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Champs de profil
      </h1>

      {/* Formulaire de création */}
      <div style={{
        background: "var(--skafform-muted)",
        border: "1px solid var(--skafform-border)",
        borderRadius: "var(--skafform-radius-lg)",
        padding: "var(--skafform-spacing-lg)",
        marginBottom: "var(--skafform-spacing-xl)",
      }}>
        <h2 style={{ fontSize: "var(--skafform-font-size-lg)", fontWeight: 600, color: "var(--skafform-foreground)", marginBottom: "var(--skafform-spacing-md)" }}>
          Ajouter un champ
        </h2>
        {actionData?.error && (
          <div style={{ color: "var(--skafform-destructive)", fontSize: "var(--skafform-font-size-sm)", marginBottom: "var(--skafform-spacing-md)" }}>
            {actionData.error}
          </div>
        )}
        <form method="post" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--skafform-spacing-md)" }}>
          <input type="hidden" name="intent" value="create" />
          <FormField label="Clé (slug)" name="metaKeyName" placeholder="ex: phone" />
          <FormField label="Label"      name="label"       placeholder="ex: Téléphone" />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
            <label style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 500, color: "var(--skafform-foreground)" }}>Type</label>
            <select name="type" style={inputStyle}>
              {META_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FormField label="Ordre" name="order" type="number" placeholder="0" />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-sm)" }}>
            <input type="checkbox" name="required" id="required-new" />
            <label htmlFor="required-new" style={{ fontSize: "var(--skafform-font-size-sm)", color: "var(--skafform-foreground)" }}>Requis</label>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" style={btnPrimaryStyle}>Ajouter</button>
          </div>
        </form>
      </div>

      {/* Liste des champs existants */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Clé", "Label", "Type", "Ordre", "Requis", ""].map(h => (
              <th key={h} style={{ textAlign: "left", color: "var(--skafform-muted-fg)", padding: "var(--skafform-spacing-sm)", borderBottom: "1px solid var(--skafform-border)", fontSize: "var(--skafform-font-size-sm)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metaKeys.map(key => (
            <tr key={key.id}>
              <td style={cellStyle}>{key.metaKeyName}</td>
              <td style={cellStyle}>{key.label}</td>
              <td style={cellStyle}>{key.type}</td>
              <td style={cellStyle}>{key.order}</td>
              <td style={cellStyle}>{key.required ? "✓" : "—"}</td>
              <td style={cellStyle}>
                <form method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={key.id} />
                  <button type="submit" style={btnDestructiveStyle}
                    onClick={e => { if (!confirm(`Supprimer "${key.label}" ?`)) e.preventDefault() }}>
                    Supprimer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {metaKeys.length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...cellStyle, color: "var(--skafform-muted-fg)", textAlign: "center", padding: "var(--skafform-spacing-xl)" }}>
                Aucun champ défini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FormField({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
      <label style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 500, color: "var(--skafform-foreground)" }}>{label}</label>
      <input type={type} name={name} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)",
  border: "1px solid var(--skafform-border)",
  borderRadius: "var(--skafform-radius)",
  fontSize: "var(--skafform-font-size-sm)",
  color: "var(--skafform-foreground)",
  background: "var(--skafform-background)",
  outline: "none",
}

const cellStyle: React.CSSProperties = {
  color: "var(--skafform-foreground)",
  padding: "var(--skafform-spacing-sm)",
  borderBottom: "1px solid var(--skafform-border)",
  fontSize: "var(--skafform-font-size-sm)",
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)",
  background: "var(--skafform-primary)",
  color: "var(--skafform-primary-fg)",
  border: "none",
  borderRadius: "var(--skafform-radius)",
  fontSize: "var(--skafform-font-size-sm)",
  fontWeight: 500,
  cursor: "pointer",
}

const btnDestructiveStyle: React.CSSProperties = {
  padding: "var(--skafform-spacing-xs) var(--skafform-spacing-sm)",
  background: "transparent",
  color: "var(--skafform-destructive)",
  border: "1px solid var(--skafform-destructive)",
  borderRadius: "var(--skafform-radius)",
  fontSize: "var(--skafform-font-size-sm)",
  cursor: "pointer",
}
