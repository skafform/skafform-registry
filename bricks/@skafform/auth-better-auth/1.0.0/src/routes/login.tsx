import LoginForm from "../components/LoginForm"

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--skafform-background)" }}>
      <LoginForm />
    </main>
  )
}
