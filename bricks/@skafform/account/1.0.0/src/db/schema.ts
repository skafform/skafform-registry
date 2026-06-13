import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core"

export const skafformMetaKeys = pgTable("skafform_meta_keys", {
  id:          uuid("id").primaryKey().defaultRandom(),
  metaKeyName: text("meta_key_name").notNull().unique(),
  label:       text("label").notNull(),
  type:        text("type").notNull().default("text"),
  required:    boolean("required").notNull().default(false),
  order:       integer("order").notNull().default(0),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
})

export const skafformUserMeta = pgTable("skafform_user_meta", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull(),
  metaKeyId: uuid("meta_key_id").notNull().references(() => skafformMetaKeys.id, { onDelete: "cascade" }),
  metaValue: text("meta_value").notNull().default(""),
})
