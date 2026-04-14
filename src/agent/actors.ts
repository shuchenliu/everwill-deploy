// ============================================================================
// Async actor definitions for the agent XState machine.
//
// Each actor is a fromPromise() stub that will be filled in during
// implementation. They are separated from the machine definition to keep
// files under 150 lines.
//
// THIS IS INTENTIONALLY LEFT INCOMPLETE — to be implemented manually.
// ============================================================================

import { fromPromise } from "xstate";
import type { AgentContext } from "./types";

/**
 * Load conversation history from the database.
 * TODO: Implement — query the conversations table by job context.
 */
export const loadHistory = fromPromise(
  async ({ input }: { input: { jobId: number } }) => {
    console.log(`[agent] Loading history for job ${input.jobId}...`);
    // TODO: Query db for conversation history
    return { messages: [] as Array<{ role: string; content: string }> };
  },
);

/**
 * Call the LLM with the current message history.
 * TODO: Implement — use an LLM SDK with SYSTEM_PROMPT.
 */
export const callLLM = fromPromise(
  async ({ input }: { input: { messages: AgentContext["messages"] } }) => {
    console.log("[agent] Calling LLM...");
    // TODO: Call LLM API with messages and system prompt
    return {
      content: "placeholder response",
      toolCall: undefined as
        | { name: string; args: Record<string, unknown> }
        | undefined,
    };
  },
);

/**
 * Execute a tool via the MCP client.
 * TODO: Implement — use spawnMcpClient().callTool().
 */
export const executeTool = fromPromise(
  async ({ input }: { input: { name: string; args: Record<string, unknown> } }) => {
    console.log(`[agent] Executing tool: ${input.name}...`);
    // TODO: Call MCP client's callTool method
    return { result: "placeholder tool result" };
  },
);
