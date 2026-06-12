import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { getAdapter } from "@skafform/core/runtime"
import type { SkafformUserData } from "@skafform/core"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")
  return { user }
}

export default function MyAccountPage({ loaderData }: { loaderData: { user: SkafformUserData } }) {
  const { user } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Mon compte
      </h1>
      <div style={{
        background: "var(--skafform-muted)",
        border: "1px solid var(--skafform-border)",
        borderRadius: "var(--skafform-radius-lg)",
        padding: "var(--skafform-spacing-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--skafform-spacing-sm)",
        marginBottom: "var(--skafform-spacing-xl)",
      }}>
        <Row label="Nom"          value={user.name} />
        <Row label="Email"        value={user.email} />
        <Row label="Rôle"         value={user.role} />
        <Row label="Membre depuis" value={new Date(user.createdAt).toLocaleDateString()} />
      </div>
      <div style={{ display: "flex", gap: "var(--skafform-spacing-md)" }}>
        <a href="/my-account/profile" style={{
          padding: `var(--skafform-spacing-sm) var(--skafform-spacing-lg)`,
          background: "var(--skafform-primary)",
          color: "var(--skafform-primary-fg)",
          borderRadius: "var(--skafform-radius)",
          textDecoration: "none",
          fontSize: "var(--skafform-font-size-sm)",
          fontWeight: 500,
        }}>
          Modifier le profil
        </a>
        <a href="/my-account/password" style={{
          padding: `var(--skafform-spacing-sm) var(--skafform-spacing-lg)`,
          background: "var(--skafform-muted)",
          color: "var(--skafform-foreground)",
          border: "1px solid var(--skafform-border)",
          borderRadius: "var(--skafform-radius)",
          textDecoration: "none",
          fontSize: "var(--skafform-font-size-sm)",
          fontWeight: 500,
        }}>
          Changer le mot de passe
        </a>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "var(--skafform-spacing-md)" }}>
      <span style={{ color: "var(--skafform-muted-fg)", minWidth: "140px", fontSize: "var(--skafform-font-size-sm)" }}>
        {label}
      </span>
      <span style={{ color: "var(--skafform-foreground)", fontSize: "var(--skafform-font-size-sm)" }}>
        {value}
      </span>
    </div>
  )
}
