import { pgTable, uuid, timestamp, text } from "drizzle-orm/pg-core"

export const skafformUsers = pgTable("skafform_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: text("auth_id").notNull(),
  provider: text("provider").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
