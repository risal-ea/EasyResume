import { Landing } from "@/components/Landing";

// The GitHub Pages build (`npm run build:site`) uses only *.site.tsx files, so this is its one page.
export default function Home() {
  return <Landing hosted />;
}
