import { eq } from "drizzle-orm"
import { db } from "@skafform/core/db"
import { skafformMetaKeys, skafformUserMeta } from "./schema.js"

export type MetaKey = typeof skafformMetaKeys.$inferSelect
export type UserMetaMap = Record<string, string>

export async function getMetaKeys(): Promise<MetaKey[]> {
  return db
    .select()
    .from(skafformMetaKeys)
    .orderBy(skafformMetaKeys.order)
}

export async function getUserMeta(userId: string): Promise<UserMetaMap> {
  const rows = await db
    .select({
      metaKeyName: skafformMetaKeys.metaKeyName,
      metaValue:   skafformUserMeta.metaValue,
    })
    .from(skafformUserMeta)
    .innerJoin(skafformMetaKeys, eq(skafformUserMeta.metaKeyId, skafformMetaKeys.id))
    .where(eq(skafformUserMeta.userId, userId))

  return Object.fromEntries(rows.map(r => [r.metaKeyName, r.metaValue]))
}

export async function saveUserMeta(userId: string, data: UserMetaMap): Promise<void> {
  const keys = await getMetaKeys()

  for (const key of keys) {
    const value = data[key.metaKeyName] ?? ""

    const existing = await db
      .select({ id: skafformUserMeta.id })
      .from(skafformUserMeta)
      .where(eq(skafformUserMeta.userId, userId))
      .where(eq(skafformUserMeta.metaKeyId, key.id))
      .limit(1)

    if (existing[0]) {
      await db
        .update(skafformUserMeta)
        .set({ metaValue: value })
        .where(eq(skafformUserMeta.id, existing[0].id))
    } else {
      await db
        .insert(skafformUserMeta)
        .values({ userId, metaKeyId: key.id, metaValue: value })
    }
  }
}

export async function createMetaKey(data: { metaKeyName: string; label: string; type?: string; required?: boolean; order?: number }): Promise<MetaKey> {
  const rows = await db
    .insert(skafformMetaKeys)
    .values(data)
    .returning()
  return rows[0]
}

export async function updateMetaKey(id: string, data: Partial<{ label: string; type: string; required: boolean; order: number }>): Promise<void> {
  await db.update(skafformMetaKeys).set(data).where(eq(skafformMetaKeys.id, id))
}

export async function deleteMetaKey(id: string): Promise<void> {
  await db.delete(skafformMetaKeys).where(eq(skafformMetaKeys.id, id))
}
