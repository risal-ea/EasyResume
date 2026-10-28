# EasyResume

A local MCP server and web UI for ATS-friendly resumes. Enter your career details once in the web UI. Then, in Claude or Codex, paste a job description and ask for a resume. The assistant reads your profile over MCP and writes tailored content, and EasyResume renders it to PDF, DOCX and Markdown with an ATS keyword report. Before downloading, you can edit the resume and choose a template in the web UI.

Everything stays on your computer in `~/.easyresume`.

Website and setup guide: https://risal-ea.github.io/EasyResume/

## Setup

Requires Node.js 20 or later.

```bash
npm install
npm run build
npm start              # web UI at http://localhost:4747
```

Open http://localhost:4747/profile and fill in your profile, or import it from your existing resume (see below). The **Connect AI** page shows the exact config for your machine.

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

## Importing an existing resume

1. On the Profile page, click **Upload resume** and choose a PDF, DOCX or TXT file (up to 10 MB). EasyResume reads the text locally.
2. Ask your assistant: *Import my resume into EasyResume*. You can also use the `import_resume` prompt. It reads the text with `get_uploaded_resume` and sends the structured data with `import_profile`.
3. The Profile page shows the imported details in the form, added to anything you already had. Review them and click **Save profile**. Nothing is saved before that.

Scanned PDFs (images of pages) contain no text. Use a DOCX or a text-based PDF instead. Dates can be a year only (e.g. `2019`) when the resume doesn't give months.

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

### Editing and templates

Before downloading, you can change a resume yourself:

- **Template**: pick Classic, Modern, Traditional (serif) or Compact on the resume page. All of them are single-column with real text and standard headings, so they stay ATS-friendly. The PDF, DOCX and preview always match.
- **Edit resume**: change the headline, summary, skills and bullets; add, remove or reorder jobs, projects and other items from your profile; reorder sections. The preview, page count and keyword coverage update as you type. Save, then download from the same page. Employers, titles, dates and schools still come from your profile, so edit those on the Profile page.

Resumes are limited to **2 pages**. When content runs over, EasyResume first tightens the spacing (and, if needed, the type size slightly) to fit. If it still doesn't fit, the editor won't save it and `create_resume` / `update_resume` return an error asking the assistant to shorten it.

Your edits are saved into the resume, so a later `update_resume` from your assistant builds on them.

### MCP tools

| Tool | What it does |
|---|---|
| `get_resume_guidelines` | ATS writing rules and the workflow |
| `get_profile` | The full profile, with an `id` on every item |
| `create_resume` | Builds, renders and checks a resume from a draft |
| `update_resume` | Changes part of a resume and re-renders it |
| `check_ats` | Keyword coverage plus format and wording checks |
| `list_resumes`, `get_resume` | Browse saved resumes |
| `get_uploaded_resume` | Text of the resume uploaded on the Profile page |
| `import_profile` | Structured profile data from that resume, held for the user's review |

**No invented facts:** the assistant references profile items by id and only writes the wording. Employers, titles, dates, schools and certificate names always come from your profile. Unknown ids are rejected, and skills that aren't in the profile are flagged.

## Development

```bash
npm run dev        # Next.js dev server on :4747
npm run dev:mcp    # MCP server from source (no web UI)
npm test           # vitest
npm run typecheck
npm run seed       # load test/fixtures/sample-profile.json (won't overwrite; add -- --force)
npx @modelcontextprotocol/inspector node dist/cli.js mcp --no-web
npm run dev:site   # the GitHub Pages landing page on :4748
npm run build:site # static export of the landing page to out/ (then rebuilds the app, which the export overwrites)
```

The landing page is shared: the local app shows it at `/`, and `.github/workflows/pages.yml` publishes a static copy to GitHub Pages on every push to `main`. The site build (`EASYRESUME_SITE=1`, see `next.config.ts`) only uses `*.site.tsx` route files, because the rest of the app needs a Node server.

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

PDF and DOCX files are rendered by the MCP process and by the web UI's resume editor. Next.js loads pdfkit and docx from `node_modules` (`serverExternalPackages`) rather than bundling them.

## Known limitations

- The PDF uses the built-in Helvetica font, which covers Latin-1 (e.g. é, ñ, ü) but not other scripts. Unsupported characters show as `?` in the PDF only. DOCX and Markdown keep them.
- Single profile, English section headings, no cover letters yet.
