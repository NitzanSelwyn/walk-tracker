import type { ReactNode } from "react";
import Header from "./Header";
import MobileNav from "./MobileNav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="flex-1 overflow-auto">{children}</main>
      <MobileNav />
    </div>
  );
}
