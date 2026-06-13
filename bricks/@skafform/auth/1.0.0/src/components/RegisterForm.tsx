import { useState } from "react"
import { useSignUp } from "../hooks"
import styles from "./RegisterForm.module.css"

interface RegisterFormProps {
  className?: string
  title?: string
  onSuccess?: () => void
}

export default function RegisterForm({ className, title = "Register", onSuccess }: RegisterFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const { signUp } = useSignUp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signUp({
      email,
      password,
      name,
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
        <input className={styles.input} type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className={styles.button} type="submit">Register</button>
      </form>
      <div className={styles.footer}>
        Already have an account?{" "}
        <a className={styles.link} href="/login">Login</a>
      </div>
    </div>
  )
}
