import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyResume",
  description: "Your career profile and ATS-friendly resumes, tailored by your AI assistant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href="/profile">
              EasyResume
            </a>
            <Nav />
          </div>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
