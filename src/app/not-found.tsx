import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import NotFoundMessage from "./(app)/not-found";

/** Unknown URLs render outside the (app) layout, so this adds its header and footer around the same message. */
export default function NotFound() {
  return (
    <>
      <SiteHeader>
        <Nav />
      </SiteHeader>
      <main className="page">
        <NotFoundMessage />
      </main>
      <SiteFooter />
    </>
  );
}
