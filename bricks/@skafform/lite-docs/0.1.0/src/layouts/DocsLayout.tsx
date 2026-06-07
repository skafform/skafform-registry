import { NavLink } from "react-router"
import type { SidebarEntry } from "../engine/sidebar.js"
import SearchBar from "../components/SearchBar.js"

interface Heading {
  depth: number
  text: string
  id: string
}

interface DocsLayoutProps {
  children: React.ReactNode
  sidebar: SidebarEntry[]
  headings: Heading[]
  currentSlug: string
}

export default function DocsLayout({ children, sidebar, headings, currentSlug }: DocsLayoutProps) {
  const toc = headings.filter(h => h.depth <= 3)

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "240px 1fr 200px",
      gap: "var(--skafform-spacing-xl)",
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "var(--skafform-spacing-xl) var(--skafform-spacing-md)",
      minHeight: "100vh",
      fontFamily: "var(--skafform-font-body)",
    }}>
      {/* Sidebar */}
      <aside style={{
        position: "sticky",
        top: "var(--skafform-spacing-xl)",
        alignSelf: "start",
        borderRight: `1px solid var(--skafform-border)`,
        paddingRight: "var(--skafform-spacing-lg)",
      }}>
        <SearchBar />
        <nav>
          {sidebar.map((entry, i) => {
            if ("items" in entry) {
              return (
                <div key={i} style={{ marginBottom: "var(--skafform-spacing-lg)" }}>
                  <div style={{
                    fontSize: "var(--skafform-font-size-xs)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--skafform-muted-fg)",
                    marginBottom: "var(--skafform-spacing-sm)",
                  }}>
                    {entry.label}
                  </div>
                  {entry.items.map(item => (
                    <SidebarLink key={item.href} href={item.href} label={item.label} currentSlug={currentSlug} />
                  ))}
                </div>
              )
            }
            return <SidebarLink key={entry.href} href={entry.href} label={entry.label} currentSlug={currentSlug} />
          })}
        </nav>
      </aside>

      {/* Content */}
      <main style={{
        minWidth: 0,
        color: "var(--skafform-foreground)",
      }}>
        {children}
      </main>

      {/* TOC */}
      {toc.length > 0 && (
        <aside style={{
          position: "sticky",
          top: "var(--skafform-spacing-xl)",
          alignSelf: "start",
          borderLeft: `1px solid var(--skafform-border)`,
          paddingLeft: "var(--skafform-spacing-lg)",
        }}>
          <div style={{
            fontSize: "var(--skafform-font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--skafform-muted-fg)",
            marginBottom: "var(--skafform-spacing-sm)",
          }}>
            Sur cette page
          </div>
          {toc.map(h => (
            <a key={h.id} href={`#${h.id}`} style={{
              display: "block",
              paddingLeft: h.depth === 2 ? 0 : "var(--skafform-spacing-md)",
              fontSize: "var(--skafform-font-size-sm)",
              color: "var(--skafform-muted-fg)",
              textDecoration: "none",
              marginBottom: "var(--skafform-spacing-xs)",
              lineHeight: 1.5,
            }}>
              {h.text}
            </a>
          ))}
        </aside>
      )}
    </div>
  )
}

function SidebarLink({ href, label, currentSlug }: { href: string; label: string; currentSlug: string }) {
  const isActive = href === `/docs/${currentSlug}` || href === `/docs/${currentSlug}/`
  return (
    <NavLink to={href} style={{
      display: "block",
      fontSize: "var(--skafform-font-size-sm)",
      color: isActive ? "var(--skafform-primary)" : "var(--skafform-foreground)",
      fontWeight: isActive ? 600 : 400,
      textDecoration: "none",
      padding: `var(--skafform-spacing-xs) 0`,
    }}>
      {label}
    </NavLink>
  )
}
