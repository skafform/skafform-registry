import { redirect } from "react-router"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { Link } from "react-router"
import { useState } from "react"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { getAdapter } from "@skafform/core/runtime"
import { db, skafformPages } from "@skafform/core/db"
import { eq } from "drizzle-orm"

type BlockType = "hero" | "heading" | "text" | "image" | "cta"
type Block = { type: BlockType; [key: string]: string }

function getTemplates(cwd: string): Record<string, { label: string }> {
  const configPath = resolve(cwd, "skafform.config.json")
  if (!existsSync(configPath)) return {}
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const theme = config?.theme ?? "theme-light"
  const themeJsonPath = resolve(cwd, `themes/${theme}/child/theme.json`)
  if (!existsSync(themeJsonPath)) return {}
  return JSON.parse(readFileSync(themeJsonPath, "utf-8"))?.page_templates ?? {}
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user) return redirect("/login")
  if (user.role !== "admin") return redirect("/")

  const id = Number(params.id)
  const [page] = await db.select().from(skafformPages).where(eq(skafformPages.id, id))
  if (!page) return redirect("/admin/pages")

  const templates = getTemplates(process.cwd())
  const blocks: Block[] = JSON.parse(page.content || "[]")
  return { page, blocks, templates }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const adapter = getAdapter()
  const user = await adapter.getSession(request)
  if (!user || user.role !== "admin") return redirect("/login")

  const id = Number(params.id)
  const formData = await request.formData()
  const title    = (formData.get("title") as string ?? "").trim()
  const slug     = (formData.get("slug") as string ?? "").trim()
  const template = (formData.get("template") as string ?? "blank").trim()
  const status   = formData.get("status") === "published" ? "published" : "draft"
  const content  = (formData.get("content") as string ?? "[]")

  await db.update(skafformPages)
    .set({ title, slug, template, content, status })
    .where(eq(skafformPages.id, id))

  return redirect("/admin/pages")
}

type LoaderData = {
  page: { id: number; slug: string; title: string; template: string; status: string }
  blocks: Block[]
  templates: Record<string, { label: string }>
}

export default function AdminPagesEditPage({ loaderData }: { loaderData: LoaderData }) {
  const { page, templates } = loaderData
  const [blocks, setBlocks] = useState<Block[]>(loaderData.blocks)

  const addBlock = (type: BlockType) => {
    setBlocks(prev => [...prev, { type, text: "", content: "", src: "", alt: "", label: "", href: "", title: "", subtitle: "", ctaLabel: "", ctaHref: "" }])
  }

  const removeBlock = (i: number) => setBlocks(prev => prev.filter((_, idx) => idx !== i))

  const updateBlock = (i: number, key: string, value: string) => {
    setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, [key]: value } : b))
  }

  const reorderBlocks = (from: number, to: number) => {
    setBlocks(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <div style={{ padding: "var(--skafform-spacing-xl)", maxWidth: "700px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-md)", marginBottom: "var(--skafform-spacing-xl)" }}>
        <Link to="/admin/pages" style={{ color: "var(--skafform-muted-fg)", textDecoration: "none", fontSize: "var(--skafform-font-size-sm)" }}>
          ← Pages
        </Link>
        <h1 style={{ fontSize: "var(--skafform-font-size-2xl)", fontWeight: 700, color: "var(--skafform-foreground)", fontFamily: "var(--skafform-font-heading)", margin: 0 }}>
          Modifier la page
        </h1>
        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-primary)", textDecoration: "none" }}>
          Voir ↗
        </a>
      </div>

      <form method="post">
        <input type="hidden" name="content" value={JSON.stringify(blocks)} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-lg)" }}>

          <div>
            <label style={labelStyle}>Titre</label>
            <input name="title" type="text" required defaultValue={page.title} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Slug</label>
            <input name="slug" type="text" required defaultValue={page.slug} style={inputStyle} />
            <p style={{ margin: "4px 0 0", fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)" }}>URL : /{page.slug}</p>
          </div>

          <div>
            <label style={labelStyle}>Template</label>
            <select name="template" defaultValue={page.template} style={inputStyle}>
              {Object.entries(templates).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Contenu</label>
            <BlockBuilder blocks={blocks} onAdd={addBlock} onRemove={removeBlock} onUpdate={updateBlock} onReorder={reorderBlocks} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-md)", paddingTop: "var(--skafform-spacing-md)", borderTop: "1px solid var(--skafform-border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-sm)", fontSize: "var(--skafform-font-size-sm)", color: "var(--skafform-foreground)", cursor: "pointer" }}>
              <input type="checkbox" name="status" value="published" defaultChecked={page.status === "published"} />
              Publier
            </label>
            <button type="submit" style={btnStyle}>Sauvegarder</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function BlockBuilder({ blocks, onAdd, onRemove, onUpdate, onReorder }: {
  blocks: Block[]
  onAdd: (type: BlockType) => void
  onRemove: (i: number) => void
  onUpdate: (i: number, key: string, value: string) => void
  onReorder: (from: number, to: number) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDragStart = (i: number) => setDragIndex(i)
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setOverIndex(i) }
  const handleDrop = (i: number) => {
    if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i)
    setDragIndex(null)
    setOverIndex(null)
  }
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null) }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--skafform-spacing-sm)" }}>
      <div style={{ display: "flex", gap: "var(--skafform-spacing-sm)", flexWrap: "wrap" }}>
        {(["hero", "heading", "text", "image", "cta"] as BlockType[]).map(type => (
          <button key={type} type="button" onClick={() => onAdd(type)} style={addBtnStyle}>
            + {type}
          </button>
        ))}
      </div>

      {blocks.map((block, i) => (
        <BlockEditor
          key={i}
          index={i}
          block={block}
          onRemove={onRemove}
          onUpdate={onUpdate}
          isDragging={dragIndex === i}
          isOver={overIndex === i && dragIndex !== i}
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  )
}

function BlockEditor({ index: i, block, onRemove, onUpdate, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd }: {
  index: number
  block: Block
  onRemove: (i: number) => void
  onUpdate: (i: number, key: string, value: string) => void
  isDragging: boolean
  isOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: "var(--skafform-muted)",
        border: `1px solid ${isOver ? "var(--skafform-primary)" : "var(--skafform-border)"}`,
        borderTop: isOver ? "3px solid var(--skafform-primary)" : undefined,
        borderRadius: "var(--skafform-radius)",
        padding: "var(--skafform-spacing-md)",
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--skafform-spacing-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--skafform-spacing-sm)" }}>
          <span style={{ cursor: "grab", color: "var(--skafform-muted-fg)", fontSize: "var(--skafform-font-size-base)", lineHeight: 1, userSelect: "none" }}>⠿</span>
          <span style={{ fontSize: "var(--skafform-font-size-xs)", fontWeight: 600, color: "var(--skafform-muted-fg)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {block.type}
          </span>
        </div>
        <button type="button" onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--skafform-muted-fg)", fontSize: "var(--skafform-font-size-sm)" }}>
          ✕
        </button>
      </div>

      {block.type === "hero" && (
        <>
          <Field label="Titre principal" value={block.title ?? ""} onChange={v => onUpdate(i, "title", v)} placeholder="Votre accroche principale" />
          <Field label="Sous-titre" value={block.subtitle ?? ""} onChange={v => onUpdate(i, "subtitle", v)} placeholder="Une phrase qui décrit votre offre" />
          <Field label="Texte du bouton" value={block.ctaLabel ?? ""} onChange={v => onUpdate(i, "ctaLabel", v)} placeholder="Commencer" />
          <Field label="URL du bouton" value={block.ctaHref ?? ""} onChange={v => onUpdate(i, "ctaHref", v)} placeholder="/contact" />
        </>
      )}
      {block.type === "heading" && (
        <Field label="Titre" value={block.text} onChange={v => onUpdate(i, "text", v)} placeholder="Titre de section" />
      )}
      {block.type === "text" && (
        <Field label="Texte" value={block.content} onChange={v => onUpdate(i, "content", v)} placeholder="Votre texte..." multiline />
      )}
      {block.type === "image" && (
        <>
          <Field label="URL image" value={block.src} onChange={v => onUpdate(i, "src", v)} placeholder="https://..." />
          <Field label="Texte alternatif" value={block.alt} onChange={v => onUpdate(i, "alt", v)} placeholder="Description de l'image" />
        </>
      )}
      {block.type === "cta" && (
        <>
          <Field label="Texte du bouton" value={block.label} onChange={v => onUpdate(i, "label", v)} placeholder="Nous contacter" />
          <Field label="URL" value={block.href} onChange={v => onUpdate(i, "href", v)} placeholder="/contact" />
        </>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div style={{ marginBottom: "var(--skafform-spacing-sm)" }}>
      <label style={{ display: "block", fontSize: "var(--skafform-font-size-xs)", fontWeight: 600, color: "var(--skafform-muted-fg)", marginBottom: "4px" }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "var(--skafform-font-size-sm)", fontWeight: 600, color: "var(--skafform-foreground)", marginBottom: "var(--skafform-spacing-xs)" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "var(--skafform-spacing-sm) var(--skafform-spacing-md)", border: "1px solid var(--skafform-border)", borderRadius: "var(--skafform-radius)", background: "var(--skafform-background)", color: "var(--skafform-foreground)", fontSize: "var(--skafform-font-size-sm)", boxSizing: "border-box", outline: "none" }
const btnStyle: React.CSSProperties = { padding: "var(--skafform-spacing-sm) var(--skafform-spacing-lg)", background: "var(--skafform-primary)", color: "var(--skafform-primary-fg)", border: "none", borderRadius: "var(--skafform-radius)", fontWeight: 600, cursor: "pointer", fontSize: "var(--skafform-font-size-sm)" }
const addBtnStyle: React.CSSProperties = { padding: "4px 12px", border: "1px solid var(--skafform-border)", borderRadius: "var(--skafform-radius-sm)", background: "var(--skafform-background)", color: "var(--skafform-foreground)", fontSize: "var(--skafform-font-size-xs)", cursor: "pointer" }
