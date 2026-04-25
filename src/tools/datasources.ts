import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Schema for the `extract_datasources` LLM tool.
 * The LLM is forced to call this tool when parsing a deployment notification;
 * the returned `input` is validated against this schema at runtime.
 */
export const datasourcesInputSchema = z.object({
  source: z
    .string()
    .url()
    .describe("URL pointing to the root location where the data sources are hosted."),
  regular_datasets: z
    .array(z.string().min(1))
    .min(0)
    .describe("Names of regular (complete) knowledge-graph datasets referenced in the message."),
  dump_only: z
    .array(z.string().min(1))
    .min(0)
    .describe(
      "Names of merged graphs and partial-by-design datasets (e.g., nodes-only, edges-only) intended for dump distribution only.",
    ),
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
      source: {
        type: "string",
        format: "uri",
        description: "URL pointing to the root location where the data sources are hosted.",
      },
      regular_datasets: {
        type: "array",
        items: { type: "string" },
        description: "Names of regular (complete) knowledge-graph datasets referenced in the message.",
        minItems: 0,
      },
      dump_only: {
        type: "array",
        items: { type: "string" },
        description:
          "Names of merged graphs and partial-by-design datasets (e.g., nodes-only, edges-only) intended for dump distribution only.",
        minItems: 0,
      },
    },
    required: ["source", "regular_datasets", "dump_only"],
  },
};
