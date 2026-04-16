// ============================================================================
// Command tag parsing for inbound Slack events.
// Extracts a "!tag" command from the message body to route the message.
// We use "!" instead of "#" because Slack autocompletes "#" to channel names.
// Messages without a recognized tag are dropped upstream.
// The set of known tags lives in queue/schema.ts (single source of truth).
// ============================================================================

import { messageTagSchema, type MessageTag } from "../../queue/schema";

/**
 * Extract the first !tag from a message text, lowercased.
 * Returns null if no tag is found or the tag is not in the known set.
 */
export function extractTag(text: string): MessageTag | null {
  const match = text.match(/!(\w+)/)?.[1]?.toLowerCase();
  if (!match) return null;
  const parsed = messageTagSchema.safeParse(match);
  return parsed.success ? parsed.data : null;
}
