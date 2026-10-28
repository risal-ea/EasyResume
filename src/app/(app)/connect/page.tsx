import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { Snippet } from "@/components/Snippet";
import { dataDir } from "@/paths";

export const dynamic = "force-dynamic";

const EXAMPLE_PROMPT = `Use EasyResume to create an ATS-friendly resume for this job:

<paste the job description here>`;

export default function ConnectPage() {
  const node = stableNodePath();
  const cli = process.env.EASYRESUME_CLI_PATH ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "dist", "cli.js");
  const built = existsSync(/*turbopackIgnore: true*/ cli);

  const desktopConfigPath =
    process.platform === "win32"
      ? "%APPDATA%\\Claude\\claude_desktop_config.json"
      : "~/Library/Application Support/Claude/claude_desktop_config.json";
  const desktopConfig = JSON.stringify({ mcpServers: { easyresume: { command: node, args: [cli, "mcp"] } } }, null, 2);
  const claudeCode = `claude mcp add easyresume --scope user -- ${shellQuote(node)} ${shellQuote(cli)} mcp`;
  const codexConfig = `[mcp_servers.easyresume]\ncommand = ${JSON.stringify(node)}\nargs = [${JSON.stringify(cli)}, "mcp"]`;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Connect your AI assistant</h1>
          <p>
            EasyResume runs as a local MCP server. Your assistant starts it on demand; nothing leaves this computer except
            what the assistant itself sends to its model.
          </p>
        </div>
      </div>

      {!built && (
        <div className="notice">
          <code>{cli}</code> does not exist yet. Run <code>npm run build</code> in the EasyResume folder first.
        </div>
      )}

      <section className="card">
        <h2>Claude Desktop</h2>
        <p className="card-intro">
          Open <strong>Settings → Developer → Edit Config</strong> (or the file <code>{desktopConfigPath}</code>), add the{" "}
          <code>easyresume</code> entry below to <code>mcpServers</code>, save, and restart Claude Desktop.
        </p>
        <Snippet text={desktopConfig} />
      </section>

      <section className="card">
        <h2>Claude Code</h2>
        <p className="card-intro">Run this once in a terminal. Check it with <code>/mcp</code> inside Claude Code.</p>
        <Snippet text={claudeCode} />
      </section>

      <section className="card">
        <h2>Codex</h2>
        <p className="card-intro">
          Add this to <code>~/.codex/config.toml</code>, then restart Codex. Check it with <code>/mcp</code>.
        </p>
        <Snippet text={codexConfig} />
      </section>

      <section className="card">
        <h2>ChatGPT</h2>
        <p className="card-intro" style={{ marginBottom: 0 }}>
          Not supported yet. ChatGPT can only reach MCP servers on the public internet, and this version runs only on
          your computer.
        </p>
      </section>

      <section className="card">
        <h2>Create a resume</h2>
        <ol className="steps" style={{ marginTop: 12 }}>
          <li>
            Fill in your profile and save it. Already have a resume? Upload it on the Profile page and ask your assistant
            to <strong>Import my resume into EasyResume</strong>; it fills in the form for you to review.
          </li>
          <li>
            In your assistant, paste a job description and ask for a resume:
            <div style={{ marginTop: 8 }}>
              <Snippet text={EXAMPLE_PROMPT} />
            </div>
          </li>
          <li>
            In Claude Desktop you can also use the <strong>tailor_resume</strong> prompt from the + menu; in Claude Code,
            type <code>/mcp__easyresume__tailor_resume</code>.
          </li>
          <li>The assistant checks keyword coverage, refines the resume, and gives you links. Find every resume under Resumes.</li>
        </ol>
        <p className="muted" style={{ marginBottom: 0 }}>
          Your data lives in <code>{dataDir()}</code>. When your assistant starts EasyResume, this web page starts with it
          (if it is not already running).
        </p>
      </section>
    </>
  );
}

/**
 * process.execPath can be a versioned install path (e.g. Homebrew's Cellar)
 * that breaks on upgrade; prefer a PATH entry that points to the same binary.
 */
function stableNodePath(): string {
  const exe = process.platform === "win32" ? "node.exe" : "node";
  try {
    const target = realpathSync(process.execPath);
    for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
      const candidate = path.join(/*turbopackIgnore: true*/ dir, exe);
      if (dir && existsSync(candidate) && realpathSync(candidate) === target) return candidate;
    }
  } catch {
    // fall through
  }
  return process.execPath;
}

function shellQuote(s: string): string {
  return /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}
