import { redirect, data } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { getAdapter } from "@skafform/core/runtime"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")
  return {}
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")

  const form = await request.formData()
  const currentPassword = form.get("currentPassword")?.toString() ?? ""
  const newPassword     = form.get("newPassword")?.toString() ?? ""
  const confirmPassword = form.get("confirmPassword")?.toString() ?? ""

  if (!currentPassword || !newPassword) {
    return data({ error: "Tous les champs sont requis." }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return data({ error: "Les mots de passe ne correspondent pas." }, { status: 400 })
  }

  const result = await getAdapter().changePassword(request, { currentPassword, newPassword })
  if (!result.success) {
    return data({ error: result.error ?? "Erreur lors du changement de mot de passe." }, { status: 400 })
  }

  return redirect("/my-account")
}

export default function PasswordPage({ actionData }: { actionData?: { error?: string } }) {
  return (
    <div style={{ padding: "var(--skafform-spacing-xl)", maxWidth: "480px" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Changer le mot de passe
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
        <PasswordField label="Mot de passe actuel"    name="currentPassword" />
        <PasswordField label="Nouveau mot de passe"   name="newPassword" />
        <PasswordField label="Confirmer le mot de passe" name="confirmPassword" />
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
          Mettre à jour
        </button>
      </form>
    </div>
  )
}

function PasswordField({ label, name }: { label: string; name: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
      <label style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 500, color: "var(--skafform-foreground)" }}>
        {label}
      </label>
      <input
        type="password"
        name={name}
        style={{
          padding: `var(--skafform-spacing-sm) var(--skafform-spacing-md)`,
          border: "1px solid var(--skafform-border)",
          borderRadius: "var(--skafform-radius)",
          fontSize: "var(--skafform-font-size-sm)",
          color: "var(--skafform-foreground)",
          background: "var(--skafform-background)",
          outline: "none",
        }}
      />
    </div>
  )
}
