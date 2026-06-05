import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy init — DATABASE_URL is only required at runtime, not build time
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export const db = {
  get select() { return getDb().select; },
  get insert() { return getDb().insert; },
  get update() { return getDb().update; },
  get delete() { return getDb().delete; },
  get query() { return getDb().query; },
};
