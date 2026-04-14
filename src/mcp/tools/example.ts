// ============================================================================
// Example MCP tool — demonstrates the pattern for adding new tools.
//
// To add a new tool:
// 1. Create a new file in this directory (e.g., deploy.ts)
// 2. Export a register function that takes an McpServer instance
// 3. Call server.registerTool() with a name, config (description + inputSchema), and handler
// 4. Import and call your register function in ../index.ts
//
// The inputSchema uses Zod — the MCP SDK validates inputs automatically.
// The handler must return { content: [...] } with text or other content types.
// ============================================================================

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Registers the "echo" example tool on the given MCP server.
 * This tool simply echoes back its input — useful for testing the MCP connection.
 */
export function registerExampleTool(server: McpServer): void {
  server.registerTool(
    "echo",
    {
      description: "Echoes back the provided message. Useful for testing.",
      inputSchema: {
        message: z.string().describe("The message to echo back"),
      },
    },
    async ({ message }) => {
      return {
        content: [{ type: "text" as const, text: `Echo: ${message}` }],
      };
    },
  );
}
