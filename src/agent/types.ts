// ============================================================================
// Agent-specific types used by the XState machine.
// Separated from loop.ts to keep each file under 150 lines.
// ============================================================================

// -- Context: the data the machine carries through its lifecycle -------------

export interface AgentContext {
  /** The queue job ID this agent run is processing. */
  jobId: number;

  /** Accumulated conversation messages (role + content pairs). */
  messages: Array<{ role: string; content: string }>;

  /** Results returned from tool executions in this run. */
  toolResults: Array<unknown>;

  /** How many think→act iterations have occurred. */
  iterationCount: number;

  /** Safety limit to prevent infinite loops. */
  maxIterations: number;

  /** Error message if the machine reaches the failed state. */
  error: string | null;
}

// -- Events: signals that drive state transitions ----------------------------

export type AgentEvent =
  | { type: "START" }
  | { type: "HISTORY_LOADED"; messages: Array<{ role: string; content: string }> }
  | {
      type: "LLM_RESPONDED";
      content: string;
      toolCall?: { name: string; args: Record<string, unknown> };
    }
  | { type: "TOOL_EXECUTED"; result: unknown }
  | { type: "DONE" }
  | { type: "ERROR"; message: string };

// -- Input: what callers provide when creating an agent actor ----------------

export interface AgentInput {
  jobId: number;
  maxIterations?: number;
}
