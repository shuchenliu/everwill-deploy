// THIS IS INTENTIONALLY LEFT INCOMPLETE — to be implemented manually.
// XState v5 machine skeleton for the agent loop. States are defined with
// comments but LLM calls, tool execution, and messaging are stubs.
// Types: ./types.ts | Async actors: ./actors.ts

import { setup, assign, createActor } from "xstate";
import type { AgentContext, AgentEvent, AgentInput } from "./types";
import { loadHistory, callLLM, executeTool } from "./actors";

export const agentMachine = setup({
  types: {
    context: {} as AgentContext,
    events: {} as AgentEvent,
    input: {} as AgentInput,
  },
  actions: {
    appendToolResult: assign({
      toolResults: ({ context, event }) => {
        if (event.type === "TOOL_EXECUTED") {
          return [...context.toolResults, event.result];
        }
        return context.toolResults;
      },
    }),
    incrementIteration: assign({
      iterationCount: ({ context }) => context.iterationCount + 1,
    }),
  },
  guards: {
    hasRemainingIterations: ({ context }) => context.iterationCount < context.maxIterations,
  },
  actors: { loadHistory, callLLM, executeTool },
}).createMachine({
  id: "agent",
  initial: "idle",

  // Context factory — creates fresh context for each actor instance
  context: ({ input }) => ({
    jobId: input.jobId,
    messages: [],
    toolResults: [],
    iterationCount: 0,
    maxIterations: input.maxIterations ?? 10,
    error: null,
  }),

  states: {
    // IDLE: Waiting for a START event to kick off the agent loop.
    idle: { on: { START: "loading_history" } },

    // LOADING_HISTORY: Fetch prior conversation messages from the database
    // so the LLM has context from previous interactions in this thread.
    loading_history: {
      invoke: {
        src: "loadHistory",
        input: ({ context }) => ({ jobId: context.jobId }),
        onDone: {
          target: "calling_llm",
          actions: assign({
            messages: ({ event }) => event.output.messages,
          }),
        },
        onError: {
          target: "failed",
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },

    // CALLING_LLM: Send the message history to the LLM and wait for a response.
    // The response may include a tool call or a final text reply.
    calling_llm: {
      entry: "incrementIteration",
      invoke: {
        src: "callLLM",
        input: ({ context }) => ({ messages: context.messages }),
        onDone: [
          {
            guard: ({ event }) => event.output.toolCall !== undefined,
            target: "executing_tool",
            actions: assign({
              messages: ({ context, event }) => [
                ...context.messages,
                { role: "assistant", content: event.output.content },
              ],
            }),
          },
          {
            target: "responding",
            actions: assign({
              messages: ({ context, event }) => [
                ...context.messages,
                { role: "assistant", content: event.output.content },
              ],
            }),
          },
        ],
        onError: {
          target: "failed",
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },

    // EXECUTING_TOOL: Run the tool the LLM requested via MCP.
    // After execution, loop back to calling_llm with the tool result.
    executing_tool: {
      invoke: {
        src: "executeTool",
        input: () => {
          // TODO: Extract tool call details from the last LLM response
          return { name: "echo", args: {} };
        },
        onDone: [
          {
            guard: "hasRemainingIterations",
            target: "calling_llm",
            actions: "appendToolResult",
          },
          {
            target: "failed",
            actions: assign({ error: () => "Max iterations exceeded" }),
          },
        ],
        onError: {
          target: "failed",
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },

    // RESPONDING: TODO — send final message back via messaging module.
    responding: { always: "done" },
    // DONE: Terminal success state.
    done: { type: "final" },
    // FAILED: Terminal error state. The error is stored in context.error.
    failed: { type: "final" },
  },
});

/** Create a running actor. Call .start() then .send({ type: "START" }). */
export function createAgentActor(input: AgentInput) {
  return createActor(agentMachine, { input });
}
