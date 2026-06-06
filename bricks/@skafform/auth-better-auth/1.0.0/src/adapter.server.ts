import { db, schema as coreSchema } from "@skafform/core/db"
import type { SkafformAuthAdapter, SkafformUserData } from "@skafform/core"
import * as authSchema from "./db/schema"
import { auth } from "./auth.server"
import { eq } from "drizzle-orm"

async function fetchUserByAuthId(authId: string): Promise<SkafformUserData | null> {
  const results = await db
    .select({
      id: coreSchema.skafformUsers.id,
      authId: coreSchema.skafformUsers.authId,
      provider: coreSchema.skafformUsers.provider,
      role: coreSchema.skafformUsers.role,
      createdAt: coreSchema.skafformUsers.createdAt,
      email: authSchema.user.email,
      name: authSchema.user.name,
      image: authSchema.user.image,
      emailVerified: authSchema.user.emailVerified,
    })
    .from(coreSchema.skafformUsers)
    .leftJoin(authSchema.user, eq(coreSchema.skafformUsers.authId, authSchema.user.id))
    .where(eq(coreSchema.skafformUsers.authId, authId))
    .limit(1)

  if (!results[0]) return null
  const r = results[0]
  return {
    id: r.id,
    authId: r.authId,
    provider: r.provider,
    role: r.role,
    createdAt: r.createdAt,
    email: r.email ?? "",
    name: r.name ?? "",
    image: r.image ?? undefined,
    emailVerified: r.emailVerified ?? false,
  }
}

export const authAdapter: SkafformAuthAdapter = {
  getUsers: async (): Promise<SkafformUserData[]> => {
    const results = await db
      .select({
        id: coreSchema.skafformUsers.id,
        authId: coreSchema.skafformUsers.authId,
        provider: coreSchema.skafformUsers.provider,
        role: coreSchema.skafformUsers.role,
        createdAt: coreSchema.skafformUsers.createdAt,
        email: authSchema.user.email,
        name: authSchema.user.name,
        image: authSchema.user.image,
        emailVerified: authSchema.user.emailVerified,
      })
      .from(coreSchema.skafformUsers)
      .leftJoin(authSchema.user, eq(coreSchema.skafformUsers.authId, authSchema.user.id))

    return results.map(r => ({
      id: r.id,
      authId: r.authId,
      provider: r.provider,
      role: r.role,
      createdAt: r.createdAt,
      email: r.email ?? "",
      name: r.name ?? "",
      image: r.image ?? undefined,
      emailVerified: r.emailVerified ?? false,
    }))
  },

  getUserById: async (id: string): Promise<SkafformUserData | null> => {
    const results = await db
      .select({
        id: coreSchema.skafformUsers.id,
        authId: coreSchema.skafformUsers.authId,
        provider: coreSchema.skafformUsers.provider,
        role: coreSchema.skafformUsers.role,
        createdAt: coreSchema.skafformUsers.createdAt,
        email: authSchema.user.email,
        name: authSchema.user.name,
        image: authSchema.user.image,
        emailVerified: authSchema.user.emailVerified,
      })
      .from(coreSchema.skafformUsers)
      .leftJoin(authSchema.user, eq(coreSchema.skafformUsers.authId, authSchema.user.id))
      .where(eq(coreSchema.skafformUsers.id, id))
      .limit(1)

    if (!results[0]) return null
    const r = results[0]
    return {
      id: r.id,
      authId: r.authId,
      provider: r.provider,
      role: r.role,
      createdAt: r.createdAt,
      email: r.email ?? "",
      name: r.name ?? "",
      image: r.image ?? undefined,
      emailVerified: r.emailVerified ?? false,
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    const rows = await db
      .select()
      .from(coreSchema.skafformUsers)
      .where(eq(coreSchema.skafformUsers.id, id))
      .limit(1)

    if (rows[0]) {
      await db.delete(authSchema.user).where(eq(authSchema.user.id, rows[0].authId))
      await db.delete(coreSchema.skafformUsers).where(eq(coreSchema.skafformUsers.id, id))
    }
  },

  getSession: async (request: Request): Promise<SkafformUserData | null> => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return null
    return fetchUserByAuthId(session.user.id)
  },
}
