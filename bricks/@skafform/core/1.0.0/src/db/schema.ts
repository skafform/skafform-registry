import { pgTable, pgEnum, serial, text, integer } from "drizzle-orm/pg-core"

export const visibilityEnum = pgEnum("skafform_visibility", [
  "public", "guest", "authenticated", "admin",
])

export const skafformMenus = pgTable("skafform_menus", {
  id:   serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
})

export const skafformMenuItems = pgTable("skafform_menu_items", {
  id:         serial("id").primaryKey(),
  menuId:     integer("menu_id").references(() => skafformMenus.id, { onDelete: "set null" }),
  key:        text("key"),
  label:      text("label").notNull(),
  href:       text("href").notNull(),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  order:      integer("order").notNull().default(0),
  parentId:   integer("parent_id"),
  brick:      text("brick"),
  target:     text("target"),
})

export const skafformNavLocationAssignments = pgTable("skafform_nav_location_assignments", {
  location: text("location").primaryKey(),
  menuId:   integer("menu_id").notNull().references(() => skafformMenus.id, { onDelete: "cascade" }),
})

export const skafformThemeSettings = pgTable("skafform_theme_settings", {
  key:   text("key").primaryKey(),
  value: text("value").notNull(),
})

export const skafformCustomizeSettings = pgTable("skafform_customize_settings", {
  key:   text("key").primaryKey(),
  value: text("value").notNull(),
})

export const skafformEmailSettings = pgTable("skafform_email_settings", {
  key:   text("key").primaryKey(),
  value: text("value").notNull(),
})

export const skafformPages = pgTable("skafform_pages", {
  id:       serial("id").primaryKey(),
  slug:     text("slug").notNull().unique(),
  title:    text("title").notNull(),
  template: text("template").notNull().default("blank"),
  content:  text("content").notNull().default("[]"),
  status:   text("status").notNull().default("draft"),
})
