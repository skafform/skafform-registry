import { useState } from "react"
import { useSignIn } from "../hooks"
import styles from "./LoginForm.module.css"

interface LoginFormProps {
  className?: string
  title?: string
  onSuccess?: () => void
}

export default function LoginForm({ className, title = "Login", onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { signIn } = useSignIn()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn({
      email,
      password,
      onSuccess: () => {
        onSuccess?.()
        window.location.href = "/"
      },
      onError: (msg) => setError(msg),
    })
  }

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      <h1 className={styles.title}>{title}</h1>
      {error && <p className={styles.error}>{error}</p>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className={styles.button} type="submit">Sign In</button>
      </form>
      <div className={styles.footer}>
        Don't have an account?{" "}
        <a className={styles.link} href="/register">Register</a>
      </div>
    </div>
  )
}
