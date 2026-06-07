import { compile } from "@mdx-js/mdx"
import { readFileSync } from "node:fs"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"
import rehypeSlug from "rehype-slug"

export interface CompiledDoc {
  code: string
  frontmatter: Record<string, string>
  headings: { depth: number; text: string; id: string }[]
}

const cache = new Map<string, CompiledDoc>()

export function invalidate(filePath: string) {
  cache.delete(filePath)
}

export function clearCache() {
  cache.clear()
}

export async function compileMdx(filePath: string): Promise<CompiledDoc> {
  if (cache.has(filePath)) return cache.get(filePath)!

  const source = readFileSync(filePath, "utf-8")
  const headings: { depth: number; text: string; id: string }[] = []

  for (const match of source.matchAll(/^(#{1,3})\s+(.+)$/gm)) {
    const text = match[2].trim()
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    headings.push({ depth: match[1].length, text, id })
  }

  const compiled = await compile(source, {
    outputFormat: "function-body",
    development: false,
    remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
    rehypePlugins: [rehypeSlug],
  })

  const result: CompiledDoc = { code: String(compiled), frontmatter: {}, headings }
  cache.set(filePath, result)
  return result
}
