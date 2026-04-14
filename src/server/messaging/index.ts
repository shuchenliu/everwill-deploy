// ============================================================================
// Messaging module — Bolt SDK in Socket Mode.
//
// This module wraps all Slack-specific code. Nothing Slack-specific leaks
// outside this directory. The rest of the app interacts with messaging
// only through the `sendMessage(channel, text)` function decorated onto
// the Fastify instance.
//
// On receiving a message or app_mention, this module acks immediately and
// enqueues a MESSAGE job — it never calls the agent loop directly.
// ============================================================================

import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import { App, LogLevel } from "@slack/bolt";
import type { FastifyInstance } from "fastify";
import { enqueue } from "../../queue";

// -- Fastify declaration merging ---------------------------------------------
// This lets other modules call fastify.sendMessage() with full type safety.

declare module "fastify" {
  interface FastifyInstance {
    sendMessage: (channel: string, text: string) => Promise<void>;
  }
}

// -- Plugin ------------------------------------------------------------------

async function messagingPlugin(fastify: FastifyInstance): Promise<void> {
  const boltApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  // Listen for direct messages
  boltApp.message(async ({ message }) => {
    // message is already acked by Bolt in Socket Mode.
    // We only care about standard user messages (not bot messages, etc.)
    if (!("text" in message) || !("user" in message) || !("channel" in message)) {
      return;
    }

    enqueue(
      "MESSAGE",
      {
        channel: message.channel,
        text: message.text ?? "",
        userId: message.user,
      },
      `msg-${message.channel}-${message.ts ?? randomUUID()}`,
    );

    fastify.log.info({ channel: message.channel }, "Enqueued MESSAGE job from DM");
  });

  // Listen for @mentions in channels
  boltApp.event("app_mention", async ({ event }) => {
    enqueue(
      "MESSAGE",
      {
        channel: event.channel,
        text: event.text,
        userId: event.user,
      },
      `mention-${event.channel}-${event.ts}`,
    );

    fastify.log.info({ channel: event.channel }, "Enqueued MESSAGE job from mention");
  });

  // Decorate Fastify with a generic send function — hides Bolt internals
  fastify.decorate("sendMessage", async (channel: string, text: string) => {
    await boltApp.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel,
      text,
    });
  });

  // Start Bolt (opens the WebSocket connection)
  await boltApp.start();
  fastify.log.info("Bolt Socket Mode connected");

  // Clean shutdown — close the WebSocket when Fastify stops
  fastify.addHook("onClose", async () => {
    await boltApp.stop();
    fastify.log.info("Bolt Socket Mode disconnected");
  });
}

// fp() breaks Fastify's default encapsulation so the sendMessage decorator
// is visible to the parent instance and sibling plugins.
export default fp(messagingPlugin, { name: "messaging" });
