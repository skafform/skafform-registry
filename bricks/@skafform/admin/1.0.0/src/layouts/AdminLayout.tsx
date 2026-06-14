import { Outlet, NavLink } from "react-router"
import adminSections from "virtual:skafform/admin-sections"

const navItems = [
  { to: "/admin",            label: "Dashboard" },
  { to: "/admin/users",      label: "Utilisateurs" },
  { to: "/admin/navigation", label: "Navigation" },
  { to: "/admin/theme",      label: "Thème" },
  { to: "/admin/customize",  label: "Personnalisation" },
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
            <NavLink key={to} to={to} end style={navLinkStyle}>
              {label}
            </NavLink>
          ))}
        </nav>

        {adminSections.length > 0 && (
          <>
            <div style={{
              fontSize: "var(--skafform-font-size-xs)",
              fontWeight: 600,
              color: "var(--skafform-muted-fg)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: "var(--skafform-spacing-lg)",
              marginBottom: "var(--skafform-spacing-xs)",
              paddingLeft: "var(--skafform-spacing-md)",
            }}>
              Website Management
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-xs)" }}>
              {adminSections.map((section: { label: string; href: string }) => (
                <NavLink key={section.href} to={section.href} end style={navLinkStyle}>
                  {section.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </aside>
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  )
}

function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    display: "block",
    padding: `var(--skafform-spacing-sm) var(--skafform-spacing-md)`,
    borderRadius: "var(--skafform-radius)",
    textDecoration: "none",
    fontSize: "var(--skafform-font-size-sm)",
    fontWeight: isActive ? 600 : 400,
    color: isActive ? "var(--skafform-primary)" : "var(--skafform-foreground)",
    background: isActive ? "var(--skafform-background)" : "transparent",
  }
}
