// ============================================================================
// Job payload types and validation schemas.
// Each job type has a Zod schema defining the shape of its payload.
// The worker validates payloads before dispatching to handlers.
// ============================================================================

import { z } from "zod";

// -- MESSAGE -----------------------------------------------------------------
// Created when a Slack message or app_mention event is received.

export const messagePayloadSchema = z.object({
  channel: z.string(),
  text: z.string(),
  userId: z.string(),
});

export type MessagePayload = z.infer<typeof messagePayloadSchema>;

// -- WEBHOOK -----------------------------------------------------------------
// Created when an external system hits POST /trigger.

export const webhookPayloadSchema = z.object({
  type: z.string(),
  payload: z.record(z.unknown()),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// -- AGENT_TASK --------------------------------------------------------------
// Created internally when the agent loop needs to schedule follow-up work.

export const agentTaskPayloadSchema = z.object({
  conversationId: z.string(),
  action: z.string(),
});

export type AgentTaskPayload = z.infer<typeof agentTaskPayloadSchema>;

// -- Lookup map for runtime validation ---------------------------------------
// Maps a job type string to its corresponding Zod schema so the worker
// can validate any job payload without a big switch statement.

export const payloadSchemas = {
  MESSAGE: messagePayloadSchema,
  WEBHOOK: webhookPayloadSchema,
  AGENT_TASK: agentTaskPayloadSchema,
} as const;
