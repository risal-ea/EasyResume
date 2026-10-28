import { existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { HOST, webPort, webUrl } from "../paths";

/** Serves the built Next.js app on 127.0.0.1 only. */
export async function startWeb(root: string): Promise<void> {
  if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
    console.error(`The web UI has not been built yet. Run \`npm run build\` in ${root}.`);
    process.exit(1);
  }
  // Next types mark NODE_ENV read-only; the production server needs it set.
  (process.env as Record<string, string | undefined>).NODE_ENV ??= "production";
  process.env.EASYRESUME_CLI_PATH ??= path.join(root, "dist", "cli.js");

  const port = webPort();
  const mod = await import("next");
  const next = ((mod as { default?: unknown }).default ?? mod) as typeof import("next").default;
  const app = next({ dev: false, dir: root, hostname: HOST, port });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = http.createServer((req, res) => void handle(req, res));
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. EasyResume may already be running at ${webUrl()}.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
  server.listen(port, HOST, () => console.log(`EasyResume web UI running at ${webUrl()}`));

  exitWithParent();
}

/** When started by the MCP process, stop once that process is gone (even if it was killed). */
function exitWithParent(): void {
  const parent = Number(process.env.EASYRESUME_PARENT_PID);
  if (!parent) return;
  setInterval(() => {
    try {
      process.kill(parent, 0);
    } catch {
      process.exit(0);
    }
  }, 3000).unref();
}
