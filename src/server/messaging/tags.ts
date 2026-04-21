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
  // Pass 1: find the first !word candidate
  const tagMatch = text.match(/!(\w+)/);
  if (!tagMatch || tagMatch.index === undefined) return null;

  const idx = tagMatch.index;
  const end = idx + tagMatch[0].length;
  const before = text.slice(0, idx);
  const after = text.slice(end);

  // Pass 2: each side must be start/end of string, whitespace, or a Slack mention token <@...>
  const validBefore = idx === 0 || /(\s|<@[^>]+>)\s*$/.test(before);
  const validAfter = end === text.length || /^(\s|<@[^>]+>)/.test(after);
  if (!validBefore || !validAfter) return null;

  const parsed = messageTagSchema.safeParse(tagMatch[1]);
  return parsed.success ? parsed.data : null;
}
