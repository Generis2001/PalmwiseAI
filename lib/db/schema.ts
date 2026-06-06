import { pgTable, text, uuid, bigint, timestamp } from "drizzle-orm/pg-core";

export const readings = pgTable("readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userAddress: text("user_address").notNull(),
  readingHash: text("reading_hash").notNull().unique(),
  encryptedReading: text("encrypted_reading").notNull(),
  txHash: text("tx_hash"),
  blockNumber: bigint("block_number", { mode: "number" }),
  archetype: text("archetype"),
  palmImage: text("palm_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Reading = typeof readings.$inferSelect;
export type NewReading = typeof readings.$inferInsert;
