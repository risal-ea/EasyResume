import Link from "next/link";
import { GitHubMark, LogoMark, REPO_URL } from "./Brand";

/** The floating header on every page. The app passes its page links as children; the landing page has none. */
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-nav">
        <Link className="site-brand" href="/" aria-label="EasyResume home">
          <LogoMark size={30} />
          <span className="site-brand-name">EasyResume</span>
        </Link>
        {children}
        <a className="btn btn-dark site-nav-cta" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Get started on GitHub">
          <GitHubMark />
          <span className="site-cta-label">
            <span className="site-cta-prefix">Get started on </span>GitHub
          </span>
        </a>
      </div>
    </header>
  );
}
