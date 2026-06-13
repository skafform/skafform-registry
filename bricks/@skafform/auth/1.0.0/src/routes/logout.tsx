import { useSignOut } from "../hooks"
import { useEffect } from "react"

export default function LogoutPage() {
  const { signOut } = useSignOut()

  useEffect(() => {
    signOut()
  }, [])

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--skafform-background)", color: "var(--skafform-muted-fg)", fontFamily: "var(--skafform-font)" }}>
      Déconnexion...
    </main>
  )
}
