import { Outlet, NavLink } from "react-router"

const navItems = [
  { to: "/admin",       label: "Dashboard" },
  { to: "/admin/users", label: "Utilisateurs" },
]

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: "240px",
        flexShrink: 0,
        background: "var(--skafform-muted)",
        borderRight: "1px solid var(--skafform-border)",
        display: "flex",
        flexDirection: "column",
        padding: "var(--skafform-spacing-lg)",
        gap: "var(--skafform-spacing-xs)",
      }}>
        <div style={{
          fontSize: "var(--skafform-font-size-lg)",
          fontWeight: 700,
          fontFamily: "var(--skafform-font-heading)",
          color: "var(--skafform-foreground)",
          marginBottom: "var(--skafform-spacing-lg)",
        }}>
          Admin
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              style={({ isActive }) => ({
                display: "block",
                padding: `var(--skafform-spacing-sm) var(--skafform-spacing-md)`,
                borderRadius: "var(--skafform-radius)",
                textDecoration: "none",
                fontSize: "var(--skafform-font-size-sm)",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--skafform-primary)" : "var(--skafform-foreground)",
                background: isActive ? "var(--skafform-background)" : "transparent",
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  )
}
