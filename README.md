# everwill

An AI agent server that automates Graph data release and deployment workflows. Everwill listens for messages via Slack (Socket Mode) and inbound webhooks, queues work into a SQLite-backed job queue, and processes it through an XState-powered agent loop with tool access via the Model Context Protocol (MCP).

## Prerequisites

- Node.js >= 22
- pnpm (`corepack enable`)
- A Slack app configured for Socket Mode (see below)
- An LLM API key

## Slack App Setup (Socket Mode)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** > **From scratch**
2. Name it (e.g., "Everwill") and select your workspace
3. Go to **Socket Mode** in the sidebar and enable it
4. You'll be prompted to generate an **App-Level Token** with `connections:write` scope — save this as `SLACK_APP_TOKEN` (starts with `xapp-`)
5. Go to **OAuth & Permissions** and add these Bot Token Scopes:
   - `chat:write` — send messages
   - `app_mentions:read` — respond to @mentions
   - `im:history` — read DMs
   - `im:read` — access DM channels
6. Install the app to your workspace
7. Copy the **Bot User OAuth Token** as `SLACK_BOT_TOKEN` (starts with `xoxb-`)
8. Go to **Event Subscriptions**, enable events, and subscribe to:
   - `message.im` — direct messages
   - `app_mention` — @mentions in channels

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
LLM_API_KEY=your-api-key
DATABASE_URL=./data/everwill.db
PORT=3000
```

## Running Locally

```bash
pnpm install
pnpm db:push        # Create/sync SQLite tables
pnpm dev             # Start with hot reload (tsx watch)
```

The server starts at `http://localhost:3000`. Test the health check:

```bash
curl http://localhost:3000/health
```

Test the webhook trigger:

```bash
curl -X POST http://localhost:3000/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "test", "payload": {"message": "hello"}}'
```

## Running with Docker

```bash
docker compose up --build
```

SQLite data persists in `./data/` via volume mount.

## Module Overview

| Module | Responsibility |
|---|---|
| `server/index.ts` | Entry point — wires Fastify, plugins, worker, and MCP together |
| `server/messaging/` | Slack Bot (Socket Mode) — receives messages, exposes `sendMessage()` |
| `server/triggers/` | Webhook POST route — validates and enqueues inbound events |
| `agent/loop.ts` | XState v5 state machine skeleton for the agent loop (incomplete) |
| `agent/prompts.ts` | System prompt placeholder for the LLM |
| `mcp/index.ts` | MCP server (stdio) and client factory for tool execution |
| `mcp/tools/` | Individual MCP tool definitions |
| `queue/index.ts` | Job queue operations — enqueue, claim, complete, fail with retry |
| `queue/worker.ts` | Polling loop that claims and dispatches jobs |
| `queue/schema.ts` | Zod schemas for job payload validation |
| `db/schema.ts` | Drizzle ORM table definitions (conversations, jobs) |
| `db/index.ts` | SQLite connection and Drizzle client setup |
| `types/index.ts` | Shared TypeScript types used across modules |

## Architecture Notes

- The **agent loop** (`agent/loop.ts`) is intentionally left as a skeleton — states are defined with comments but not implemented
- The **messaging module** hides all Slack-specific types behind a generic `sendMessage(channel, text)` interface
- The **queue worker** has zero knowledge of Slack or webhooks — it only knows about job types and their handlers
- All database operations use **Drizzle ORM** with **better-sqlite3** (synchronous driver) for atomic queue operations
- The **MCP server** runs as a child process communicating via stdio — tools are registered there and called from the agent loop
