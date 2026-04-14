// ============================================================================
// Queue worker — a simple polling loop that claims and dispatches jobs.
//
// The worker has ZERO knowledge of Slack, webhooks, or any external system.
// It receives a handler map at startup and dispatches jobs by type.
// This keeps the worker decoupled and testable.
// ============================================================================

import { claimJob, completeJob, failJob } from "./index";
import type { HandlerMap } from "../types";

/** How often to poll for new jobs when the queue is idle (milliseconds). */
const DEFAULT_POLL_INTERVAL_MS = 1000;

/**
 * Start the queue worker.
 *
 * @param handlers - Map from JobType to async handler function.
 *                   Injected by the server entry point so the worker
 *                   stays agnostic about what each job type does.
 * @param intervalMs - Polling interval in milliseconds (default: 1000).
 * @returns Object with a `stop()` method for graceful shutdown.
 */
export function start(
  handlers: HandlerMap,
  intervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): { stop: () => void } {
  let running = true;

  const timer = setInterval(async () => {
    if (!running) return;

    // Try to claim the next available job
    const job = claimJob();
    if (!job) return; // Nothing to do — wait for next poll

    const handler = handlers[job.type as keyof HandlerMap];
    if (!handler) {
      // Unknown job type — fail immediately, don't retry
      failJob(job.id, `No handler registered for job type: ${job.type}`);
      return;
    }

    try {
      // Parse the JSON payload and hand it to the appropriate handler
      const payload: unknown = JSON.parse(job.payload);
      await handler(payload);
      completeJob(job.id);
    } catch (err) {
      // Let failJob handle retry logic and exponential backoff
      const message = err instanceof Error ? err.message : String(err);
      failJob(job.id, message);
    }
  }, intervalMs);

  return {
    stop(): void {
      running = false;
      clearInterval(timer);
    },
  };
}
