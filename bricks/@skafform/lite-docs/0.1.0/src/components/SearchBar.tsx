import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router"
import type { SearchEntry } from "../engine/search.js"

export default function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchEntry[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/docs/search?q=${encodeURIComponent(value)}`)
      const data: SearchEntry[] = await res.json()
      setResults(data)
      setOpen(true)
      setLoading(false)
    }, 200)
  }

  function handleSelect(slug: string) {
    setOpen(false)
    setQuery("")
    navigate(`/docs/${slug}`)
  }

  return (
    <div ref={containerRef} style={{ position: "relative", marginBottom: "var(--skafform-spacing-lg)" }}>
      <input
        type="search"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Rechercher..."
        style={{
          width: "100%",
          padding: "var(--skafform-spacing-xs) var(--skafform-spacing-sm)",
          fontSize: "var(--skafform-font-size-sm)",
          border: `1px solid var(--skafform-border)`,
          borderRadius: "var(--skafform-radius-sm)",
          background: "var(--skafform-background)",
          color: "var(--skafform-foreground)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--skafform-background)",
          border: `1px solid var(--skafform-border)`,
          borderRadius: "var(--skafform-radius-sm)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          zIndex: 50,
          maxHeight: "320px",
          overflowY: "auto",
        }}>
          {loading && (
            <div style={{ padding: "var(--skafform-spacing-sm)", fontSize: "var(--skafform-font-size-sm)", color: "var(--skafform-muted-fg)" }}>
              Recherche...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: "var(--skafform-spacing-sm)", fontSize: "var(--skafform-font-size-sm)", color: "var(--skafform-muted-fg)" }}>
              Aucun résultat
            </div>
          )}
          {!loading && results.map(r => (
            <button
              key={r.slug}
              onClick={() => handleSelect(r.slug)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "var(--skafform-spacing-sm)",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom: `1px solid var(--skafform-border)`,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--skafform-muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <div style={{ fontSize: "var(--skafform-font-size-sm)", fontWeight: 600, color: "var(--skafform-foreground)" }}>
                {r.title}
              </div>
              {r.excerpt && (
                <div style={{ fontSize: "var(--skafform-font-size-xs)", color: "var(--skafform-muted-fg)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.excerpt}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
