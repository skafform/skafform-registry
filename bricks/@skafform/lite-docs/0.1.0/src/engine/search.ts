import { readFileSync } from "node:fs"
import { buildSlugIndex } from "./sidebar.js"

export interface SearchEntry {
  slug: string
  title: string
  excerpt: string
}

function extractText(source: string): { title: string; body: string } {
  const lines = source.split("\n")
  let inFrontmatter = false
  let frontmatterDone = false
  let title = ""
  const bodyLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (i === 0 && line === "---") { inFrontmatter = true; continue }
    if (inFrontmatter && line === "---") { inFrontmatter = false; frontmatterDone = true; continue }
    if (inFrontmatter) {
      const m = line.match(/^title:\s*(.+)$/)
      if (m) title = m[1].trim()
      continue
    }
    if (!frontmatterDone) frontmatterDone = true

    const clean = line
      .replace(/^#+\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/^[>\-*]\s+/, "")
      .trim()

    if (clean) bodyLines.push(clean)
  }

  return { title, body: bodyLines.join(" ") }
}

export function buildSearchIndex(docsDir: string): SearchEntry[] {
  const slugIndex = buildSlugIndex(docsDir)
  const entries: SearchEntry[] = []

  for (const [slug, filePath] of slugIndex) {
    const source = readFileSync(filePath, "utf-8")
    const { title, body } = extractText(source)
    const excerpt = body.slice(0, 160)
    entries.push({ slug, title: title || slug, excerpt })
  }

  return entries
}

export function searchDocs(docsDir: string, query: string): SearchEntry[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return buildSearchIndex(docsDir).filter(
    e => e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q)
  )
}
