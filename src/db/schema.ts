// ============================================================================
// Drizzle ORM table definitions for SQLite.
// These are the single source of truth for the database schema.
// Run `pnpm db:push` to sync these to the SQLite file.
// ============================================================================

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// -- Conversations table -----------------------------------------------------
// Stores the message history for each agent conversation thread.

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  /** JSON-encoded array of message objects ({ role, content }). */
  messages: text("messages").notNull().default("[]"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// -- Jobs table --------------------------------------------------------------
// The queue persists jobs here. The worker polls this table for pending work.

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  /** Callers provide this to prevent duplicate job creation. Unique constraint. */
  idempotencyKey: text("idempotency_key").notNull().unique(),

  /** One of: MESSAGE, WEBHOOK, AGENT_TASK */
  type: text("type").notNull(),

  /** Current lifecycle state: pending → active → completed | failed */
  status: text("status").notNull().default("pending"),

  /** JSON-encoded job-specific data. Parsed by the handler. */
  payload: text("payload").notNull(),

  /** How many times this job has been attempted so far. */
  attempts: integer("attempts").notNull().default(0),

  /** Maximum number of attempts before the job is marked as failed. */
  maxAttempts: integer("max_attempts").notNull().default(3),

  /** Human-readable error message from the most recent failure. */
  lastError: text("last_error"),

  /** ISO 8601 timestamp — job won't be retried until after this time. */
  retryAfter: text("retry_after"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
