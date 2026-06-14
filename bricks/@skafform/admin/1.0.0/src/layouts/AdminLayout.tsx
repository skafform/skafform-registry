import { Outlet, NavLink } from "react-router"
import adminSections from "virtual:skafform/admin-sections"

type BrickSection = { label: string; href: string; group?: string }

type NavGroup = {
  label: string
  key: string
  items: { to: string; label: string }[]
}

const coreGroups: NavGroup[] = [
  {
    label: "Contenu",
    key: "content",
    items: [
      { to: "/admin/pages", label: "Pages" },
    ],
  },
  {
    label: "Apparence",
    key: "appearance",
    items: [
      { to: "/admin/theme",     label: "Thème" },
      { to: "/admin/customize", label: "Personnalisation" },
    ],
  },
  {
    label: "Structure",
    key: "structure",
    items: [
      { to: "/admin/navigation", label: "Navigation" },
    ],
  },
  {
    label: "Utilisateurs",
    key: "users",
    items: [
      { to: "/admin/users", label: "Utilisateurs" },
    ],
  },
  {
    label: "Réglages",
    key: "settings",
    items: [
      { to: "/admin/configuration", label: "Email" },
    ],
  },
]

export default function AdminLayout() {
  const sections = adminSections as BrickSection[]

  const groupedSections = coreGroups.map(group => ({
    ...group,
    items: [
      ...group.items,
      ...sections
        .filter(s => s.group === group.key)
        .map(s => ({ to: s.href, label: s.label })),
    ],
  }))

  const extensions = sections.filter(s => !s.group || !coreGroups.find(g => g.key === s.group))

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
        overflowY: "auto",
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

        <NavLink to="/admin" end style={navLinkStyle}>
          Dashboard
        </NavLink>

        {groupedSections.map(group => (
          <NavGroup key={group.key} label={group.label} items={group.items} />
        ))}

        {extensions.length > 0 && (
          <NavGroup
            label="Extensions"
            items={extensions.map(s => ({ to: s.href, label: s.label }))}
          />
        )}
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  )
}

function NavGroup({ label, items }: { label: string; items: { to: string; label: string }[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: "var(--skafform-spacing-md)" }}>
      <div style={{
        fontSize: "var(--skafform-font-size-xs)",
        fontWeight: 600,
        color: "var(--skafform-muted-fg)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        paddingLeft: "var(--skafform-spacing-md)",
        marginBottom: "var(--skafform-spacing-xs)",
      }}>
        {label}
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map(({ to, label }) => (
          <NavLink key={to} to={to} end style={navLinkStyle}>
            {label}
          </NavLink>
        ))}
      </nav>
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
