// ============================================================================
// Command tag parsing for inbound Slack events.
// Extracts a "!tag" command from the message body to route the message.
// We use "!" instead of "#" because Slack autocompletes "#" to channel names.
// Messages without a recognized tag are dropped upstream.
// The set of known tags lives in queue/schema.ts (single source of truth).
// ============================================================================

import { messageTagSchema, type MessageTag } from "../../queue/schema";

/**
 * Extract the first standalone !tag from a message text.
 * The tag must be surrounded by whitespace (or string boundaries) and
 * match the known set exactly — case-sensitive. This prevents both
 * unintended matches (e.g. "good!deploy") and typos (e.g. "!Deploy").
 * Returns null if no tag is found or the tag is not in the known set.
 */
export function extractTag(text: string): MessageTag | null {
  const match = text.match(/(?<=^|\s)!(\w+)(?=\s|$)/)?.[1];
  if (!match) return null;
  const parsed = messageTagSchema.safeParse(match);
  return parsed.success ? parsed.data : null;
}
