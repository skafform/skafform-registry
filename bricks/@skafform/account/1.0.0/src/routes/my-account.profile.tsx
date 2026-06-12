import { redirect, data } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { getAdapter } from "@skafform/core/runtime"
import type { SkafformUserData } from "@skafform/core"
import { getMetaKeys, getUserMeta, saveUserMeta } from "../db/meta.js"
import type { MetaKey } from "../db/meta.js"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")
  const [metaKeys, userMeta] = await Promise.all([
    getMetaKeys(),
    getUserMeta(user.id),
  ])
  return { user, metaKeys, userMeta }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")

  const form = await request.formData()
  const name = form.get("name")?.toString().trim()

  if (!name) return data({ error: "Le nom est requis." }, { status: 400 })

  const metaKeys = await getMetaKeys()
  const metaData: Record<string, string> = {}
  for (const key of metaKeys) {
    metaData[key.metaKeyName] = form.get(key.metaKeyName)?.toString() ?? ""
  }

  await Promise.all([
    getAdapter().updateProfile(user.id, { name }),
    saveUserMeta(user.id, metaData),
  ])

  return redirect("/my-account")
}

type LoaderData = {
  user: SkafformUserData
  metaKeys: MetaKey[]
  userMeta: Record<string, string>
}

export default function ProfilePage({ loaderData, actionData }: {
  loaderData: LoaderData
  actionData?: { error?: string }
}) {
  const { user, metaKeys, userMeta } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)", maxWidth: "480px" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Modifier le profil
      </h1>
      {actionData?.error && (
        <div style={{
          padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)",
          background: "var(--skafform-destructive)",
          color: "var(--skafform-destructive-fg)",
          borderRadius: "var(--skafform-radius)",
          fontSize: "var(--skafform-font-size-sm)",
          marginBottom: "var(--skafform-spacing-lg)",
        }}>
          {actionData.error}
        </div>
      )}
      <form method="post" style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-lg)" }}>
        <Field label="Nom"   name="name"  defaultValue={user.name} />
        <Field label="Email" name="email" defaultValue={user.email} disabled />

        {metaKeys.map(key => (
          <Field
            key={key.id}
            label={key.label}
            name={key.metaKeyName}
            type={key.type}
            defaultValue={userMeta[key.metaKeyName] ?? ""}
            required={key.required}
          />
        ))}

        <button type="submit" style={{
          padding: `var(--skafform-spacing-sm) var(--skafform-spacing-lg)`,
          background: "var(--skafform-primary)",
          color: "var(--skafform-primary-fg)",
          border: "none",
          borderRadius: "var(--skafform-radius)",
          fontSize: "var(--skafform-font-size-sm)",
          fontWeight: 500,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}>
          Enregistrer
        </button>
      </form>
    </div>
  )
}

function Field({ label, name, type = "text", defaultValue, disabled, required }: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
      <label style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 500, color: "var(--skafform-foreground)" }}>
        {label}{required && <span style={{ color: "var(--skafform-destructive)", marginLeft: "2px" }}>*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          required={required}
          rows={4}
          style={{
            padding: `var(--skafform-spacing-sm) var(--skafform-spacing-md)`,
            border: "1px solid var(--skafform-border)",
            borderRadius: "var(--skafform-radius)",
            fontSize: "var(--skafform-font-size-sm)",
            color: "var(--skafform-foreground)",
            background: "var(--skafform-background)",
            outline: "none",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          style={{
            padding: `var(--skafform-spacing-sm) var(--skafform-spacing-md)`,
            border: "1px solid var(--skafform-border)",
            borderRadius: "var(--skafform-radius)",
            fontSize: "var(--skafform-font-size-sm)",
            color: disabled ? "var(--skafform-muted-fg)" : "var(--skafform-foreground)",
            background: disabled ? "var(--skafform-muted)" : "var(--skafform-background)",
            outline: "none",
          }}
        />
      )}
    </div>
  )
}
