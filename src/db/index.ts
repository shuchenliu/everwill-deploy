// ============================================================================
// Database client setup.
// Creates the SQLite connection and Drizzle ORM instance.
// Exports both so that queue operations can use raw transactions
// (via `sqlite`) while most code uses the typed Drizzle API (`db`).
// ============================================================================

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database, { type Database as DatabaseType } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/everwill.db";

// Ensure the directory for the SQLite file exists
const dbDir = dirname(DATABASE_URL);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create the raw SQLite connection
const sqlite: DatabaseType = new Database(DATABASE_URL);

// WAL mode allows concurrent readers while a write is in progress.
// Important because the polling worker and webhook handler both access the DB.
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle ORM instance with our schema for typed queries
const db = drizzle(sqlite, { schema });

/** Cleanly close the database connection (called during graceful shutdown). */
function close(): void {
  sqlite.close();
}

export { db, sqlite, close };
