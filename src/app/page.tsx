import Link from "next/link";
import { GitHubMark, LogoMark, REPO_URL } from "@/components/Brand";
import { CopyButton } from "@/components/CopyButton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const SETUP = ["git clone https://github.com/risal-ea/EasyResume.git", "cd EasyResume", "npm install", "npm run build", "npm start"];

const STEPS = [
  {
    title: "Fill in your profile once",
    body: "Add your experience, education, skills and projects. Already have a resume? Upload the PDF or DOCX and your assistant imports it for you to review.",
  },
  {
    title: "Paste a job description",
    body: "Ask Claude or Codex for a resume. It reads your profile over MCP, picks the relevant items and rewrites the bullets around the job's keywords.",
  },
  {
    title: "Review, edit and download",
    body: "Check the ATS report, choose a template, change anything you like, then download a PDF, DOCX or Markdown file.",
  },
];

const FEATURES = [
  {
    icon: "check",
    title: "ATS keyword report",
    body: "See which keywords from the job description your resume covers, plus format and wording checks.",
  },
  {
    icon: "shield",
    title: "No invented facts",
    body: "Your assistant writes the wording. Employers, titles, dates and schools always come from your profile.",
  },
  {
    icon: "upload",
    title: "Import your old resume",
    body: "Upload a PDF, DOCX or TXT file and your assistant fills in your profile for you to check and save.",
  },
  {
    icon: "layout",
    title: "Four ATS-friendly templates",
    body: "Classic, Modern, Traditional and Compact. Single-column, real text and standard headings.",
  },
  {
    icon: "pencil",
    title: "Edit before you download",
    body: "Change bullets and reorder sections while the preview, page count and keyword coverage update as you type.",
  },
  {
    icon: "laptop",
    title: "Stays on your computer",
    body: "Your profile and resumes are stored in ~/.easyresume. There is no account to create.",
  },
] as const;

// Decorative badges that sit on the hero's rings.
const BADGES = [
  { style: { left: "24%", top: "7%" }, color: "#e8763a", content: <Sparkle size={26} /> },
  { style: { right: "24%", top: "9%" }, color: "#d92d20", content: "PDF" },
  { style: { left: "9%", top: "55%" }, color: "#1b1b18", content: ">_" },
  { style: { right: "8%", top: "52%" }, color: "#2b579a", content: "DOCX" },
  { style: { left: "14%", top: "80%" }, color: "#1b1b18", content: "M↓" },
  { style: { right: "14%", top: "78%" }, color: "#12b76a", content: <Icon name="check" size={26} /> },
];

export default function Home() {
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
            <Link className="btn btn-primary btn-lg" href="/profile">
              Build your profile
            </Link>
            <Link className="btn btn-lg" href="/connect">
              Connect your AI
            </Link>
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

      <section className="lp-section" id="how-it-works">
        <div className="lp-section-head">
          <span className="lp-eyebrow">How it works</span>
          <h2>From job post to finished resume in three steps</h2>
        </div>
        <ol className="lp-steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="lp-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Features</span>
          <h2>ATS-friendly, and true to your career</h2>
          <p>Your assistant does the tailoring. EasyResume keeps the facts straight and the format readable by machines.</p>
        </div>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature">
              <span className="lp-feature-icon">
                <Icon name={f.icon} size={20} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta" id="get-started">
        <div>
          <h2>Get started in a few minutes</h2>
          <p>
            EasyResume needs Node.js 20 or later. Clone the repo, build it, and open the web UI at localhost:4747 to fill
            in your profile. Then connect your assistant.
          </p>
          <div className="lp-ctas">
            <a className="btn btn-dark btn-lg" href={REPO_URL} target="_blank" rel="noreferrer">
              <GitHubMark />
              Get started on GitHub
            </a>
            <Link className="btn btn-lg" href="/connect">
              Connect your AI
            </Link>
          </div>
        </div>
        <div className="lp-terminal">
          <pre>
            <code>
              {SETUP.map((line) => (
                <span key={line}>
                  <span className="lp-prompt">$ </span>
                  {line}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
          <CopyButton text={SETUP.join("\n")} />
        </div>
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
  shield: <path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6z" />,
  upload: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  layout: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  pencil: <path d="M4 20h4L18.5 9.5l-4-4L4 16v4zM13 7l4 4" />,
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
