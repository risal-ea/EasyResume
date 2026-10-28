import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import net from "node:net";
import { dataDir, HOST, webLogPath, webPort } from "../paths";

/**
 * Starts `easyresume web` as a child process unless something already
 * listens on the port. Its output goes to web.log: in stdio mode our own
 * stdout belongs to the MCP protocol.
 */
export async function ensureWebRunning(cliPath: string): Promise<ChildProcess | null> {
  if (await isPortInUse(webPort())) return null;
  mkdirSync(dataDir(), { recursive: true });
  const log = openSync(webLogPath(), "a");
  const child = spawn(process.execPath, [...process.execArgv, cliPath, "web"], {
    stdio: ["ignore", log, log],
    env: { ...process.env, EASYRESUME_PARENT_PID: String(process.pid) },
  });
  child.on("error", (err) => console.error("EasyResume: could not start the web UI:", err.message));
  process.on("exit", () => child.kill());
  return child;
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: HOST });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}
