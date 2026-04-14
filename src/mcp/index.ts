// ============================================================================
// MCP (Model Context Protocol) server and client setup.
//
// This module has two roles:
//
// 1. SERVER ENTRY POINT — When this file is executed directly (as a child
//    process), it starts an MCP server connected via stdio transport.
//    All tool definitions are registered here. IMPORTANT: the server must
//    only write to stdout via the MCP protocol. All logging goes to stderr.
//
// 2. CLIENT FACTORY — The `spawnMcpClient()` export spawns this file as a
//    child process and returns a typed `callTool` function. The agent loop
//    (or server wiring) uses this to invoke tools over the MCP protocol.
// ============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { registerExampleTool } from "./tools/example";

// -- MCP Client (used by the agent loop) ------------------------------------

/** Return type of callTool — matches the MCP SDK's CallToolResult shape. */
interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Spawn the MCP server as a child process and return a client interface.
 * The client automatically restarts the server if it crashes.
 */
export async function spawnMcpClient(): Promise<{
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  close: () => Promise<void>;
}> {
  let client: Client;
  let transport: StdioClientTransport;

  async function connect(): Promise<void> {
    transport = new StdioClientTransport({
      command: "tsx",
      args: [new URL(import.meta.url).pathname],
      stderr: "inherit", // MCP server logs go to parent's stderr
    });

    client = new Client({ name: "everwill-agent", version: "1.0.0" });
    await client.connect(transport);
    console.error("[mcp] Client connected to MCP server");
  }

  // Initial connection
  await connect();

  return {
    async callTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<ToolResult> {
      try {
        const result = await client.callTool({ name, arguments: args });
        return result as ToolResult;
      } catch (err) {
        // If the server crashed, try to reconnect once before giving up
        console.error("[mcp] Tool call failed, attempting reconnect...", err);
        await connect();
        const result = await client.callTool({ name, arguments: args });
        return result as ToolResult;
      }
    },

    async close(): Promise<void> {
      await client.close();
    },
  };
}

// -- MCP Server (runs when this file is executed directly) -------------------
// Detect if this file is the entry point (spawned as child process).
// When imported by the client factory above, this block does not run.

const isDirectExecution = process.argv[1]?.endsWith("mcp/index.ts")
  || process.argv[1]?.endsWith("mcp/index.js");

if (isDirectExecution) {
  const server = new McpServer({
    name: "everwill-mcp",
    version: "1.0.0",
  });

  // Register all tools here — add new registerXxxTool() calls as you build them
  registerExampleTool(server);

  // Connect via stdio — the MCP protocol uses stdin/stdout for JSON-RPC
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr only — stdout is reserved for MCP protocol messages
  console.error("[mcp] Server started on stdio transport");
}
