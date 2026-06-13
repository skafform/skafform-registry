import { db } from "@skafform/core/db"
import type { SkafformAuthAdapter, SkafformUserData } from "@skafform/core"
import * as authSchema from "./db/schema"
import { auth } from "./auth.server"
import { eq } from "drizzle-orm"

type AuthUser = typeof authSchema.user.$inferSelect

function mapUser(r: AuthUser): SkafformUserData {
  return {
    id: r.id,
    email: r.email,
    name: r.name ?? "",
    role: (r as AuthUser & { role: string }).role ?? "user",
    image: r.image ?? undefined,
    emailVerified: r.emailVerified,
    createdAt: r.createdAt,
  }
}

export const authAdapter: SkafformAuthAdapter = {
  getUsers: async (): Promise<SkafformUserData[]> => {
    const rows = await db.select().from(authSchema.user)
    return rows.map(mapUser)
  },

  getUserById: async (id: string): Promise<SkafformUserData | null> => {
    const rows = await db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, id))
      .limit(1)
    if (!rows[0]) return null
    return mapUser(rows[0])
  },

  updateProfile: async (userId: string, data: { name?: string }): Promise<void> => {
    if (data.name === undefined) return
    await db
      .update(authSchema.user)
      .set({ name: data.name })
      .where(eq(authSchema.user.id, userId))
  },

  changePassword: async (request: Request, data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      await auth.api.changePassword({
        body: { currentPassword: data.currentPassword, newPassword: data.newPassword, revokeOtherSessions: false },
        headers: request.headers,
      })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    await db.delete(authSchema.user).where(eq(authSchema.user.id, id))
  },

  getSession: async (request: Request): Promise<SkafformUserData | null> => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return null
    const u = session.user as AuthUser & { role?: string }
    return {
      id: u.id,
      email: u.email,
      name: u.name ?? "",
      role: u.role ?? "user",
      image: u.image ?? undefined,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    }
  },
}
