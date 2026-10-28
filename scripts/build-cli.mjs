// Bundles the CLI (MCP server + web launcher) into dist/cli.js.
// npm dependencies stay external so pdfkit/next/etc. load from node_modules.
import { chmodSync, readFileSync } from "node:fs";
import { build } from "esbuild";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

await build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: Object.keys(pkg.dependencies ?? {}),
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
  logLevel: "info",
});

chmodSync("dist/cli.js", 0o755);
