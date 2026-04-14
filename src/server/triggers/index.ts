// ============================================================================
// Triggers module — inbound webhook POST route.
//
// External systems (CI/CD, GitHub Actions, etc.) hit POST /trigger to
// enqueue work. The route validates the payload, enqueues a job, and
// responds immediately with 202 Accepted.
// ============================================================================

import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { enqueue } from "../../queue";

// -- Payload validation ------------------------------------------------------
// Webhooks must include at minimum a type and payload field.

const triggerBodySchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown()),
});

// -- Plugin ------------------------------------------------------------------

async function triggersPlugin(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /trigger — enqueue work from external webhooks.
   * Responds immediately with 202 and the job's idempotency key.
   */
  fastify.post("/trigger", async (request, reply) => {
    const parsed = triggerBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid payload",
        details: parsed.error.flatten(),
      });
    }

    // Use a random UUID as the idempotency key for webhooks.
    // Callers can include their own key in the payload if they need dedup.
    const idempotencyKey = `webhook-${randomUUID()}`;

    enqueue("WEBHOOK", parsed.data, idempotencyKey);

    fastify.log.info({ type: parsed.data.type }, "Enqueued WEBHOOK job");

    return reply.status(202).send({
      accepted: true,
      idempotencyKey,
    });
  });

  /**
   * GET /health — simple liveness check.
   * Returns 200 with { status: "ok" } if the server is running.
   */
  fastify.get("/health", async () => {
    return { status: "ok" };
  });
}

export default fp(triggersPlugin, { name: "triggers" });
