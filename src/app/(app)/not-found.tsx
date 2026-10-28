import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-header">
      <div>
        <h1>Page not found</h1>
        <p>
          This page does not exist, or the resume was deleted. See <Link href="/resumes">all resumes</Link> or go to your{" "}
          <Link href="/profile">profile</Link>.
        </p>
      </div>
    </div>
  );
}
