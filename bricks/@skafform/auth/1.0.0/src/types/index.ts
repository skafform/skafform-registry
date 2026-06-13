export interface SignInOptions {
  email: string
  password: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export interface SignUpOptions {
  email: string
  password: string
  name: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export type { SkafformAuthAdapter } from "@skafform/core"
