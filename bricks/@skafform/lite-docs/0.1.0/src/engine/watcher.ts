import { watch, existsSync } from "node:fs"
import { resolve } from "node:path"
import { invalidate } from "./compiler.js"

let started = false

export function startWatcher(docsDir: string) {
  if (started || !existsSync(docsDir)) return
  started = true

  watch(docsDir, { recursive: true }, (_event, filename) => {
    if (!filename?.endsWith(".mdx")) return
    const filePath = resolve(docsDir, filename)
    invalidate(filePath)
  })
}
