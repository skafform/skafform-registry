import { readdirSync, statSync, readFileSync, existsSync } from "node:fs"
import { resolve, join } from "node:path"

export interface SidebarItem {
  label: string
  href: string
}

export interface SidebarGroup {
  label: string
  items: SidebarItem[]
}

export type SidebarEntry = SidebarItem | SidebarGroup

function formatLabel(name: string): string {
  return name
    .replace(/^\d+-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
}

function getFrontmatterTitle(filePath: string): string | null {
  try {
    const source = readFileSync(filePath, "utf-8")
    const match = source.match(/^---\n[\s\S]*?^title:\s*(.+)$/m)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function fileToSlug(docsDir: string, filePath: string): string {
  return filePath
    .slice(docsDir.length + 1)
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "")
    .replace(/\\/g, "/")
    .split("/")
    .map(segment => segment.replace(/^\d+-/, ""))
    .join("/")
}

export function buildSlugIndex(docsDir: string): Map<string, string> {
  const index = new Map<string, string>()
  if (!existsSync(docsDir)) return index

  function scan(dir: string) {
    for (const entry of readdirSync(dir).sort()) {
      const fullPath = resolve(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        scan(fullPath)
      } else if (entry.endsWith(".mdx")) {
        const slug = fileToSlug(docsDir, fullPath)
        index.set(slug, fullPath)
      }
    }
  }

  scan(docsDir)
  return index
}

export function buildSidebar(docsDir: string): SidebarEntry[] {
  if (!existsSync(docsDir)) return []

  const entries: SidebarEntry[] = []

  const sortedEntries = readdirSync(docsDir).sort((a, b) => {
    if (a === "index.mdx") return -1
    if (b === "index.mdx") return 1
    return a.localeCompare(b)
  })

  for (const entry of sortedEntries) {
    const fullPath = resolve(docsDir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      const children = readdirSync(fullPath).sort().filter(f => f.endsWith(".mdx"))
      const items: SidebarItem[] = children.map(child => {
        const childPath = join(fullPath, child)
        const slug = fileToSlug(docsDir, childPath)
        const label = getFrontmatterTitle(childPath) ?? formatLabel(child.replace(/\.mdx$/, ""))
        return { label, href: `/docs/${slug}` }
      })
      if (items.length > 0) {
        entries.push({ label: formatLabel(entry), items })
      }
    } else if (entry.endsWith(".mdx")) {
      const slug = fileToSlug(docsDir, fullPath)
      const label = getFrontmatterTitle(fullPath) ?? formatLabel(entry.replace(/\.mdx$/, ""))
      entries.push({ label, href: `/docs/${slug}` })
    }
  }

  return entries
}
