// ============================================================================
// Server entry point — wires everything together.
//
// This file contains NO business logic. It:
// 1. Loads environment variables
// 2. Creates the Fastify instance
// 3. Registers plugins (messaging, triggers)
// 4. Starts the queue worker with job handlers
// 5. Spawns the MCP client
// 6. Listens for HTTP connections
// 7. Handles graceful shutdown
// ============================================================================

import "dotenv/config";
import Fastify from "fastify";
import messagingPlugin from "./messaging";
import triggersPlugin from "./triggers";
import { start as startWorker } from "../queue/worker";
import { spawnMcpClient } from "../mcp";
import { close as closeDb } from "../db";
import type { HandlerMap } from "../types";
import { messagePayloadSchema } from "../queue/schema";
import { parseDatasources } from "../agent/parse";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
});

// -- Register plugins --------------------------------------------------------

await app.register(messagingPlugin);
await app.register(triggersPlugin);

// -- Spawn MCP client --------------------------------------------------------

const mcp = await spawnMcpClient();
app.log.info("MCP client connected");

// -- Start queue worker ------------------------------------------------------
// Job handlers are defined here so the worker stays decoupled from
// any specific module. Each handler receives a parsed JSON payload.

const handlers: HandlerMap = {
  async MESSAGE(payload) {
    // Validate shape. DMs currently enqueue without a `tag`, so we use
    // safeParse to avoid throwing on untagged messages.
    const result = messagePayloadSchema.safeParse(payload);
    if (!result.success) {
      app.log.info({ payload }, "MESSAGE without recognized tag — skipping");
      return;
    }
    const message = result.data;

    if (message.tag === "deploy") {
      const parsed = await parseDatasources(message.text);
      app.log.info({ channel: message.channel, parsed }, "Parsed deploy payload");

      const formatList = (items: string[]): string =>
        items.length === 0 ? "  _(none)_" : items.map((s) => `  • ${s}`).join("\n");

      const reply = [
        `*Parsed deploy payload:*`,
        `*Source:* ${parsed.source}`,
        `*Regular datasets* (${parsed.regular_datasets.length}):`,
        formatList(parsed.regular_datasets),
        `*Dump-only* (${parsed.dump_only.length}):`,
        formatList(parsed.dump_only),
      ].join("\n");

      await app.sendMessage(message.channel, reply);
      return;
    }

    app.log.info({ tag: message.tag }, "MESSAGE tag not yet handled");
  },

  async WEBHOOK(payload) {
    // TODO: Route to appropriate handler based on webhook type
    app.log.info({ payload }, "Processing WEBHOOK job");
  },

  async AGENT_TASK(payload) {
    // TODO: Execute agent sub-task (e.g., scheduled follow-up)
    app.log.info({ payload }, "Processing AGENT_TASK job");
  },
};

const worker = startWorker(handlers);
app.log.info("Queue worker started");

// -- Graceful shutdown -------------------------------------------------------

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down...`);
  worker.stop();
  await mcp.close();
  await app.close(); // triggers onClose hooks (stops Bolt)
  closeDb();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// -- Start listening ---------------------------------------------------------

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
