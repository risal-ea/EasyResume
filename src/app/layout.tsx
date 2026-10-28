import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyResume",
  description: "Your career profile and ATS-friendly resumes, tailored by your AI assistant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
