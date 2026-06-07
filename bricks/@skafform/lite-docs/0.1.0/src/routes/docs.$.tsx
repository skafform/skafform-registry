import { resolve } from "node:path"
import * as runtime from "react/jsx-runtime"
import { useMemo } from "react"
import { useLoaderData } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { compileMdx } from "../engine/compiler.js"
import { buildSidebar, buildSlugIndex } from "../engine/sidebar.js"
import { startWatcher } from "../engine/watcher.js"
import DocsLayout from "../layouts/DocsLayout.js"

const docsDir = resolve(process.cwd(), "docs")

export async function loader({ params }: LoaderFunctionArgs) {
  startWatcher(docsDir)

  const slug = (params["*"] || "index").replace(/\/$/, "") || "index"
  const slugIndex = buildSlugIndex(docsDir)
  const filePath = slugIndex.get(slug)

  if (!filePath) throw new Response("Not Found", { status: 404 })

  const sidebar = buildSidebar(docsDir)
  const doc = await compileMdx(filePath)

  const fn = new Function(doc.code)
  const mod = fn(runtime)
  const frontmatter: Record<string, string> = mod.frontmatter ?? {}

  return { slug, sidebar, code: doc.code, frontmatter, headings: doc.headings }
}

function useMdxComponent(code: string) {
  return useMemo(() => {
    const fn = new Function(code)
    const mod = fn(runtime)
    return mod.default as React.ComponentType
  }, [code])
}

export default function DocsPage() {
  const { code, frontmatter, headings, sidebar, slug } = useLoaderData() as Awaited<ReturnType<typeof loader>>
  const Content = useMdxComponent(code)

  return (
    <DocsLayout sidebar={sidebar} headings={headings} currentSlug={slug}>
      {frontmatter.title && (
        <h1 style={{ fontFamily: "var(--skafform-font-heading)", marginBottom: "var(--skafform-spacing-lg)" }}>
          {frontmatter.title}
        </h1>
      )}
      <Content />
    </DocsLayout>
  )
}
