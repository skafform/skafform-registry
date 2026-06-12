import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db, schema as coreSchema } from "@skafform/core/db"
import * as schema from "./db/schema"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.insert(coreSchema.skafformUsers).values({
            authId: user.id,
            provider: "better-auth",
            email: user.email,
            name: user.name ?? undefined,
          })
        },
      },
    },
  },
})
