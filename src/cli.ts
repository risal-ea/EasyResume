import path from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp/server";
import { dataDir, webLogPath, webUrl } from "./paths";
import { ensureWebRunning } from "./web/spawn";
import { startWeb } from "./web/start";

// Both src/cli.ts (dev) and dist/cli.js (built) sit one level below the package root.
const cliPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(cliPath), "..");

const USAGE = `EasyResume: local MCP server + web UI for ATS-friendly resumes

Usage:
  easyresume web            Start the web UI at ${webUrl()}
  easyresume mcp            Start the MCP server on stdio (for Claude / Codex).
                            Also starts the web UI in the background if it is not running.
  easyresume mcp --no-web   MCP server only

Data folder: ${dataDir()} (set EASYRESUME_HOME to change it)`;

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "web":
    await startWeb(root);
    break;
  case "mcp":
    await startMcp(!args.includes("--no-web"));
    break;
  case undefined:
  case "help":
  case "--help":
  case "-h":
    console.log(USAGE);
    break;
  default:
    console.error(`Unknown command: ${command}\n\n${USAGE}`);
    process.exit(1);
}

async function startMcp(withWeb: boolean): Promise<void> {
  // stdout carries the MCP protocol: anything else must go to stderr.
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
  console.error("EasyResume MCP server running on stdio");

  const exit = () => process.exit(0);
  process.stdin.on("close", exit);
  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);

  if (withWeb) {
    const child = await ensureWebRunning(cliPath);
    if (child) console.error(`EasyResume web UI starting at ${webUrl()} (log: ${webLogPath()})`);
  }
}
