// ============================================================================
// Shared TypeScript types used across all modules.
// This file is the leaf of the dependency graph — it must NOT import from
// any other src/ module to avoid circular dependencies.
// ============================================================================

// -- Job system types --------------------------------------------------------

/** Possible states a job moves through in the queue. */
export type JobStatus = "pending" | "active" | "completed" | "failed";

/** The kinds of work the queue can process. */
export type JobType = "MESSAGE" | "WEBHOOK" | "AGENT_TASK";

/** A job record as stored in the database. */
export interface Job {
  id: number;
  idempotencyKey: string;
  type: JobType;
  status: JobStatus;
  payload: string; // JSON-encoded, parsed by the consumer
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  retryAfter: string | null; // ISO 8601 timestamp or null
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// -- Conversation types ------------------------------------------------------

/** A conversation record linking a thread of messages to an agent run. */
export interface Conversation {
  id: number;
  messages: string; // JSON-encoded array of message objects
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// -- Messaging abstraction ---------------------------------------------------

/**
 * Generic send-message function signature.
 * Messaging modules implement this so the rest of the app never
 * depends on Slack-specific (or any platform-specific) types.
 */
export type SendMessage = (channel: string, text: string) => Promise<void>;

// -- Queue handler type ------------------------------------------------------

/** A function that processes a single job's payload. */
export type JobHandler = (payload: unknown) => Promise<void>;

/** Map from job type to its handler — injected into the worker at startup. */
export type HandlerMap = Record<JobType, JobHandler>;
