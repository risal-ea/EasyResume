import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader>
        <Nav />
      </SiteHeader>
      <main className="page">{children}</main>
      <SiteFooter />
    </>
  );
}
