# EasyResume

A local MCP server and web UI for ATS-friendly resumes. Enter your career details once in the web UI. Then, in Claude or Codex, paste a job description and ask for a resume. The assistant reads your profile over MCP and writes tailored content, and EasyResume renders it to PDF, DOCX and Markdown with an ATS keyword report.

Everything stays on your computer in `~/.easyresume`.

## Setup

Requires Node.js 20 or later.

```bash
npm install
npm run build
npm start              # web UI at http://localhost:4747
```

Open http://localhost:4747/profile and fill in your profile. The **Connect AI** page shows the exact config for your machine.

## Connect an AI client

All clients start the same command: `node /path/to/EasyResume/dist/cli.js mcp`. That process also starts the web UI in the background (logging to `~/.easyresume/web.log`) if it isn't already running, and stops it when the client exits.

**Claude Code**

```bash
claude mcp add easyresume --scope user -- node "$PWD/dist/cli.js" mcp
```

**Claude Desktop**: Settings → Developer → Edit Config, then restart:

```json
{
  "mcpServers": {
    "easyresume": { "command": "/absolute/path/to/node", "args": ["/absolute/path/to/EasyResume/dist/cli.js", "mcp"] }
  }
}
```

Use absolute paths, because Claude Desktop does not use your shell's `PATH`.

**Codex**: add to `~/.codex/config.toml`:

```toml
[mcp_servers.easyresume]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/EasyResume/dist/cli.js", "mcp"]
```

**ChatGPT** is not supported yet. It only connects to MCP servers on the public internet.

## Using it

> Use EasyResume to create an ATS-friendly resume for this job: *(paste the job description)*

Or use the `tailor_resume` prompt (the + menu in Claude Desktop, `/mcp__easyresume__tailor_resume` in Claude Code).

The assistant:

1. reads the guidelines and your profile;
2. extracts keywords from the job description;
3. creates the resume;
4. reads the ATS report;
5. fixes gaps; and
6. gives you the links.

Every resume is listed under **Resumes** in the web UI, with a preview, downloads and the ATS report.

### MCP tools

| Tool | What it does |
|---|---|
| `get_resume_guidelines` | ATS writing rules and the workflow |
| `get_profile` | The full profile, with an `id` on every item |
| `create_resume` | Builds, renders and checks a resume from a draft |
| `update_resume` | Changes part of a resume and re-renders it |
| `check_ats` | Keyword coverage plus format and wording checks |
| `list_resumes`, `get_resume` | Browse saved resumes |

**No invented facts:** the assistant references profile items by id and only writes the wording. Employers, titles, dates, schools and certificate names always come from your profile. Unknown ids are rejected, and skills that aren't in the profile are flagged.

## Development

```bash
npm run dev        # Next.js dev server on :4747
npm run dev:mcp    # MCP server from source (no web UI)
npm test           # vitest
npm run typecheck
npm run seed       # load test/fixtures/sample-profile.json (won't overwrite; add -- --force)
npx @modelcontextprotocol/inspector node dist/cli.js mcp --no-web
```

Environment variables: `EASYRESUME_HOME` (data folder, default `~/.easyresume`), `EASYRESUME_PORT` (default `4747`).

```
src/
  cli.ts              easyresume web | mcp
  core/               framework-free: schema, stores, build, renderers, ATS check
  mcp/                MCP server, tools, prompt and guidelines
  web/                Next.js launcher and the child-process spawn used by `mcp`
  app/, components/   Next.js web UI
test/                 vitest suites and fixtures
```

Only the MCP process renders PDF and DOCX files. The web UI serves them from disk, so Next.js never bundles pdfkit or docx.

## Known limitations

- The PDF uses the built-in Helvetica font, which covers Latin-1 (e.g. é, ñ, ü) but not other scripts. Unsupported characters show as `?` in the PDF only. DOCX and Markdown keep them.
- Single profile, English section headings, no cover letters yet.
