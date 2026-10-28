import Link from "next/link";
import { GitHubMark, LogoMark, REPO_URL } from "./Brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="site-brand" href="/">
        <LogoMark size={22} />
        EasyResume
      </Link>
      <span>ATS-friendly resumes, tailored by your AI assistant.</span>
      <a href={REPO_URL} target="_blank" rel="noreferrer">
        <GitHubMark />
        GitHub
      </a>
    </footer>
  );
}
