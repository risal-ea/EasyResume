import { GitHubMark, LogoMark, REPO_URL } from "./Brand";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { Snippet } from "./Snippet";

const INSTALL = `git clone https://github.com/risal-ea/EasyResume.git
cd EasyResume
npm install
npm run build
npm start`;

const CLAUDE_CODE = `claude mcp add easyresume --scope user -- node "$PWD/dist/cli.js" mcp`;

const PROMPT = `Use EasyResume to create an ATS-friendly resume for this job:

<paste the job description here>`;

// Decorative badges that sit on the hero's rings.
const BADGES = [
  { style: { left: "24%", top: "7%" }, color: "#e8763a", content: <Sparkle size={26} /> },
  { style: { right: "24%", top: "9%" }, color: "#d92d20", content: "PDF" },
  { style: { left: "9%", top: "55%" }, color: "#1b1b18", content: ">_" },
  { style: { right: "8%", top: "52%" }, color: "#2b579a", content: "DOCX" },
  { style: { left: "14%", top: "80%" }, color: "#1b1b18", content: "M↓" },
  { style: { right: "14%", top: "78%" }, color: "#12b76a", content: <Icon name="check" size={26} /> },
];

/**
 * The landing page. `hosted` is the GitHub Pages copy: there the web UI is not on the same origin, so links into it
 * point at the local app the guide asks the reader to start.
 */
export function Landing({ hosted }: { hosted: boolean }) {
  const appUrl = hosted ? "http://localhost:4747" : "";

  const guide = [
    {
      title: "Install and start it",
      body: (
        <>
          <p>
            EasyResume runs on your computer and needs <a href="https://nodejs.org">Node.js</a> 20 or later. Clone the
            repository, build it, and start the web UI at localhost:4747.
          </p>
          <Snippet text={INSTALL} />
        </>
      ),
    },
    {
      title: "Connect your AI assistant",
      body: (
        <>
          <p>
            For Claude Code, run this once in the EasyResume folder, then check it with <code>/mcp</code>:
          </p>
          <Snippet text={CLAUDE_CODE} />
          <p>
            For Claude Desktop or Codex, open <a href={`${appUrl}/connect`}>Connect AI</a> in the web UI. It shows the
            exact config for your computer. From then on, your assistant starts EasyResume when it needs it. ChatGPT is
            not supported yet, because it only connects to MCP servers on the public internet.
          </p>
        </>
      ),
    },
    {
      title: "Fill in your profile",
      body: (
        <>
          <p>
            Open <a href={`${appUrl}/profile`}>your profile</a> and add your experience, education, skills and projects,
            even details you would not put on every resume. Your assistant picks what fits each job.
          </p>
          <p>
            Already have a resume? Click <strong>Upload resume</strong> on the Profile page (PDF, DOCX or TXT) and ask
            your assistant to <em>Import my resume into EasyResume</em>. Check the form, then click{" "}
            <strong>Save profile</strong>. Scanned PDFs contain no text, so use a DOCX or a text-based PDF.
          </p>
        </>
      ),
    },
    {
      title: "Ask for a tailored resume",
      body: (
        <>
          <p>Paste a job description into your assistant and ask for a resume:</p>
          <Snippet text={PROMPT} />
          <p>
            It reads your profile, picks out the job&apos;s keywords, writes the resume, checks it, and gives you a link.
            You can also use the <strong>tailor_resume</strong> prompt: the + menu in Claude Desktop, or{" "}
            <code>/mcp__easyresume__tailor_resume</code> in Claude Code.
          </p>
        </>
      ),
    },
    {
      title: "Review, edit and download",
      body: (
        <>
          <p>
            Open <a href={`${appUrl}/resumes`}>Resumes</a> to see the ATS report: keyword coverage plus format and
            wording checks. Pick a template (Classic, Modern, Traditional or Compact), change the wording with{" "}
            <strong>Edit resume</strong>, then download a PDF, DOCX or Markdown file.
          </p>
          <p>
            Resumes fit on two pages. Employers, titles, dates and schools always come from your profile, so your
            assistant cannot invent them.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="landing">
      <SiteHeader />

      <section className="lp-hero">
        <div className="lp-rings" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="lp-decor" aria-hidden="true">
          {BADGES.map((b, i) => (
            <span key={i} className="lp-badge" style={{ ...b.style, color: b.color, animationDelay: `${i * -1.2}s` }}>
              {b.content}
            </span>
          ))}

          <div className="lp-note">Paste a job description. Get a resume written for that job.</div>

          <div className="lp-ats">
            <div className="lp-ats-head">
              <div>
                <strong>ATS report</strong>
                <div className="muted">Senior Frontend Engineer</div>
              </div>
              <span className="score score-good">
                92<small>score</small>
              </span>
            </div>
            <div className="lp-ats-label">
              <span>Keywords</span>
              <span>24 / 26</span>
            </div>
            <div className="lp-meter">
              <span />
            </div>
            <span className="chip chip-ok">React</span>
            <span className="chip chip-ok">TypeScript</span>
            <span className="chip chip-ok">GraphQL</span>
            <span className="chip chip-ok">Testing</span>
            <span className="chip chip-missing">Storybook</span>
          </div>
        </div>

        <div className="lp-hero-inner">
          <div className="lp-appicon" aria-hidden="true">
            <LogoMark size={48} />
          </div>

          <div className="lp-meta">
            <span>
              <Sparkle size={16} color="#e8763a" />
              Works with <strong>Claude</strong> and <strong>Codex</strong>
            </span>
            <span>
              <Icon name="laptop" size={16} />
              Runs on <strong>your computer</strong>
            </span>
          </div>

          <h1>
            Tailor your resume <span>for every job</span>
          </h1>
          <p className="lp-lead">
            Paste a job description into Claude or Codex. EasyResume turns your career profile into an ATS-friendly
            resume, checks the keywords, and hands you a PDF, DOCX or Markdown file.
          </p>

          <div className="lp-ctas">
            {hosted ? (
              <>
                <a className="btn btn-primary btn-lg" href="#guide">
                  Read the guide
                </a>
                <a className="btn btn-lg" href={REPO_URL} target="_blank" rel="noreferrer">
                  <GitHubMark />
                  View on GitHub
                </a>
              </>
            ) : (
              <>
                <a className="btn btn-primary btn-lg" href="/profile">
                  Open your profile
                </a>
                <a className="btn btn-lg" href="#guide">
                  Read the guide
                </a>
              </>
            )}
          </div>

          <div className="lp-stack" aria-hidden="true">
            <div className="lp-event">
              <span className="lp-avatar lp-avatar-amber">
                <Sparkle size={18} />
              </span>
              <div>
                <p>
                  <strong>Claude</strong> created <strong>Senior Frontend Engineer · Acme</strong>
                </p>
                <p className="lp-event-meta">just now · via EasyResume MCP</p>
              </div>
            </div>
            <div className="lp-event">
              <span className="lp-avatar lp-avatar-blue">
                <Icon name="layout" size={18} />
              </span>
              <div>
                <p>
                  <strong>Modern</strong> template applied
                </p>
                <p className="lp-event-meta">Fits on 2 pages · 24 of 26 keywords</p>
              </div>
            </div>
            <div className="lp-event">
              <span className="lp-avatar lp-avatar-red">
                <Icon name="file" size={18} />
              </span>
              <div>
                <p>
                  <strong>resume.pdf</strong> downloaded
                </p>
                <p className="lp-event-meta">Also ready as DOCX and Markdown</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip">
        <p>Works with the assistant you already use, and exports the formats recruiters ask for</p>
        <ul>
          <li>Claude Desktop</li>
          <li>Claude Code</li>
          <li>Codex</li>
          <li className="lp-strip-divider" aria-hidden="true" />
          <li>PDF</li>
          <li>DOCX</li>
          <li>Markdown</li>
        </ul>
      </section>

      <section className="lp-section" id="guide">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Guide</span>
          <h2>How to use EasyResume</h2>
          <p>Set it up once, then get a resume tailored to every job you apply for.</p>
        </div>
        <ol className="lp-guide">
          {guide.map((step, i) => (
            <li key={step.title}>
              <span className="lp-guide-num">{i + 1}</span>
              <div className="lp-guide-body">
                <h3>{step.title}</h3>
                {step.body}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <SiteFooter />
    </div>
  );
}

function Sparkle({ size, color }: { size: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color ?? "currentColor"} aria-hidden="true">
      <path d="M12 2.5Q13 11 21.5 12 13 13 12 21.5 11 13 2.5 12 11 11 12 2.5Z" />
    </svg>
  );
}

const ICONS = {
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </>
  ),
  layout: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 19h20" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
};

function Icon({ name, size }: { name: keyof typeof ICONS; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
