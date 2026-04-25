import Anthropic from "@anthropic-ai/sdk";
import {
  datasourcesInputSchema,
  datasourcesToolDef,
  type DatasourcesInput,
} from "../tools/datasources";

const LLM_API_KEY = process.env.LLM_API_KEY;
if (!LLM_API_KEY) {
  throw new Error("LLM_API_KEY is not set");
}

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are Everwill, an agent that processes graph pipeline deployment notifications.

Your job is to extract the deployment payload from a notification message.
Call the \`extract_datasources\` tool with three fields:

- source: a URL pointing to the root location where the data is hosted.
- regular_datasets: the names of regular, complete knowledge-graph datasets
  referenced in the message.
- dump_only: the names of merged graphs and partial-by-design datasets
  (e.g., nodes-only or edges-only) that are intended for dump distribution only.

Do not invent values. If a category has no items, return an empty array for it.
If the hosting URL is not present, do not invent one.`;

const client = new Anthropic({ apiKey: LLM_API_KEY });

/**
 * Parse a Slack message body and extract the list of datasources.
 *
 * Throws if the LLM fails to emit a `tool_use` block or if the emitted
 * payload doesn't match `datasourcesInputSchema`.
 */
export async function parseDatasources(messageText: string): Promise<DatasourcesInput> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [datasourcesToolDef],
    tool_choice: { type: "tool", name: datasourcesToolDef.name },
    messages: [{ role: "user", content: messageText }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("LLM did not return a tool_use block");
  }
  if (toolUse.name !== datasourcesToolDef.name) {
    throw new Error(`Unexpected tool call: ${toolUse.name}`);
  }

  return datasourcesInputSchema.parse(toolUse.input);
}
