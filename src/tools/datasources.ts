import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Schema for the `extract_datasources` LLM tool.
 * The LLM is forced to call this tool when parsing a deployment notification;
 * the returned `input` is validated against this schema at runtime.
 */
export const datasourcesInputSchema = z.object({
  sources: z
    .array(z.string().min(1))
    .min(1)
    .describe("Names of the source knowledge graphs referenced in the message."),
});

export type DatasourcesInput = z.infer<typeof datasourcesInputSchema>;

/**
 * Anthropic tool definition. Kept in sync with the Zod schema above by hand
 * for now — switch to zod-to-json-schema if the shape grows.
 */
export const datasourcesToolDef: Anthropic.Tool = {
  name: "extract_datasources",
  description:
    "Extract the list of source data graphs (datasources) mentioned in a pipeline deployment notification. Return every distinct source graph name found in the message.",
  input_schema: {
    type: "object",
    properties: {
      sources: {
        type: "array",
        items: { type: "string" },
        description: "Names of the source knowledge graphs referenced in the message.",
        minItems: 1,
      },
    },
    required: ["sources"],
  },
};
