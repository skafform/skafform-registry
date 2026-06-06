import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { getAdapter } from "@skafform/core/runtime"
import type { SkafformUserData } from "@skafform/core"

export async function loader({ request }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")
  const users = await adapter.getUsers()
  return { user, users }
}

export default function AdminUsersPage({ loaderData }: { loaderData: { user: SkafformUserData; users: SkafformUserData[] } }) {
  const { users } = loaderData

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Utilisateurs ({users.length})
      </h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Nom", "Email", "Provider", "Créé le"].map(h => (
              <th key={h} style={{
                textAlign: "left",
                color: "var(--skafform-muted-fg)",
                padding: "var(--skafform-spacing-sm)",
                borderBottom: "1px solid var(--skafform-border)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ color: "var(--skafform-foreground)", padding: "var(--skafform-spacing-sm)", borderBottom: "1px solid var(--skafform-border)" }}>{u.name}</td>
              <td style={{ color: "var(--skafform-foreground)", padding: "var(--skafform-spacing-sm)", borderBottom: "1px solid var(--skafform-border)" }}>{u.email}</td>
              <td style={{ color: "var(--skafform-muted-fg)", padding: "var(--skafform-spacing-sm)", borderBottom: "1px solid var(--skafform-border)" }}>{u.provider}</td>
              <td style={{ color: "var(--skafform-muted-fg)", padding: "var(--skafform-spacing-sm)", borderBottom: "1px solid var(--skafform-border)" }}>
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
