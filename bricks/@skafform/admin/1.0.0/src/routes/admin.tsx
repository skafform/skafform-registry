import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { getAdapter } from "@skafform/core/runtime"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAdapter().getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")
  return { user }
}

export default function AdminPage({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { user } = loaderData as { user: NonNullable<Awaited<ReturnType<typeof getAdapter>["getSession"]>> }

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)" }}>
      <h1 style={{
        fontSize: "var(--skafform-font-size-2xl)",
        fontWeight: 700,
        color: "var(--skafform-foreground)",
        marginBottom: "var(--skafform-spacing-lg)",
        fontFamily: "var(--skafform-font-heading)",
      }}>
        Dashboard
      </h1>
      <p style={{ color: "var(--skafform-muted-fg)" }}>
        Connecté en tant que : {user.email}
      </p>
      <nav style={{
        marginTop: "var(--skafform-spacing-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--skafform-spacing-sm)",
      }}>
        <a href="/admin/users" style={{ color: "var(--skafform-primary)", textDecoration: "none" }}>
          → Gérer les utilisateurs
        </a>
      </nav>
    </div>
  )
}
