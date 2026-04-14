// ============================================================================
// Queue operations — enqueue, claim, complete, fail.
// All database access for jobs goes through these four functions.
// Uses SQLite transactions (via better-sqlite3) for atomic claim logic.
// ============================================================================

import { eq, and, or, isNull, lte } from "drizzle-orm";
import { db, sqlite } from "../db";
import { jobs } from "../db/schema";
import type { JobType, Job } from "../types";

// -- Helpers -----------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

/**
 * Calculate the retry_after timestamp using exponential backoff.
 * attempt 1 → 2s, attempt 2 → 4s, attempt 3 → 8s
 */
function backoff(attempts: number): string {
  const delayMs = Math.pow(2, attempts) * 1000;
  return new Date(Date.now() + delayMs).toISOString();
}

// -- Public API --------------------------------------------------------------

/**
 * Add a job to the queue.
 * Silent no-op if a job with the same idempotencyKey already exists,
 * preventing duplicate processing of the same event.
 */
export function enqueue(
  type: JobType,
  payload: unknown,
  idempotencyKey: string,
): void {
  // INSERT OR IGNORE skips the insert if the unique constraint
  // on idempotency_key is violated — no error thrown.
  db.insert(jobs)
    .values({
      idempotencyKey,
      type,
      status: "pending",
      payload: JSON.stringify(payload),
      attempts: 0,
      maxAttempts: 3,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing({ target: jobs.idempotencyKey })
    .run();
}

/**
 * Atomically claim the oldest pending job that is ready to run.
 * Returns the job, or null if nothing is available.
 *
 * "Ready to run" means: status is pending AND (retry_after is null OR in the past).
 * Wrapped in a SQLite transaction for atomicity — no two workers can claim
 * the same job even in a theoretical multi-process setup.
 */
// The transaction is defined separately so the export is a plain function,
// not a better-sqlite3 Transaction type (which breaks declaration emit).
const claimJobTx = sqlite.transaction((): Job | null => {
  const currentTime = now();

  // Find the oldest eligible job
  const job = db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "pending"),
        or(isNull(jobs.retryAfter), lte(jobs.retryAfter, currentTime)),
      ),
    )
    .orderBy(jobs.createdAt)
    .limit(1)
    .get();

  if (!job) return null;

  // Mark it as active so no other worker picks it up
  db.update(jobs)
    .set({ status: "active", updatedAt: currentTime })
    .where(eq(jobs.id, job.id))
    .run();

  return { ...job, status: "active" } as Job;
});

export function claimJob(): Job | null {
  return claimJobTx();
}

/**
 * Mark a job as completed. Called after successful processing.
 */
export function completeJob(id: number): void {
  db.update(jobs)
    .set({ status: "completed", updatedAt: now() })
    .where(eq(jobs.id, id))
    .run();
}

/**
 * Record a job failure. Increments attempts and either:
 * - Schedules a retry with exponential backoff (if attempts < maxAttempts)
 * - Marks the job as permanently failed (if attempts >= maxAttempts)
 */
export function failJob(id: number, error: string): void {
  const job = db.select().from(jobs).where(eq(jobs.id, id)).get();
  if (!job) return;

  const nextAttempts = job.attempts + 1;
  const exhausted = nextAttempts >= job.maxAttempts;

  db.update(jobs)
    .set({
      status: exhausted ? "failed" : "pending",
      attempts: nextAttempts,
      lastError: error,
      retryAfter: exhausted ? null : backoff(nextAttempts),
      updatedAt: now(),
    })
    .where(eq(jobs.id, id))
    .run();
}
