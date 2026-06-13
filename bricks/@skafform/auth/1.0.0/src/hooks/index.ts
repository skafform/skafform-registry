import { authClient } from "../auth-client"
import type { SignInOptions, SignUpOptions } from "../types"

export function useSignIn() {
  const signIn = async ({ email, password, onSuccess, onError }: SignInOptions) => {
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => onSuccess?.(),
        onError: (ctx) => onError?.(ctx.error.message),
      }
    )
  }
  return { signIn }
}

export function useSignUp() {
  const signUp = async ({ email, password, name, onSuccess, onError }: SignUpOptions) => {
    await authClient.signUp.email(
      { email, password, name },
      {
        onSuccess: () => onSuccess?.(),
        onError: (ctx) => onError?.(ctx.error.message),
      }
    )
  }
  return { signUp }
}

export function useSession() {
  return authClient.useSession()
}

export function useSignOut() {
  const signOut = async (onSuccess?: () => void) => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          onSuccess?.()
          window.location.href = "/login"
        },
        onError: () => {
          window.location.href = "/login"
        },
      },
    })
  }
  return { signOut }
}
