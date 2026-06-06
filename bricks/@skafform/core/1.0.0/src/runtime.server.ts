import type { SkafformAuthAdapter } from "./index"

let _adapter: SkafformAuthAdapter | null = null

export function setAdapter(adapter: SkafformAuthAdapter): void {
  _adapter = adapter
}

export function getAdapter(): SkafformAuthAdapter {
  if (!_adapter) throw new Error("Skafform: no auth adapter registered. Call setAdapter() in entry.server.tsx.")
  return _adapter
}
