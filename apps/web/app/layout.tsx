import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BackEndWorkSpace",
  description: "Monorepo starter: Next.js + Spring Boot",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <header className="global-header">
            <div className="global-header-inner">
              <Link href="/" className="global-brand">
                BackEndWorkSpace
              </Link>
              <nav className="global-nav" aria-label="global navigation">
                <Link href="/" className="global-nav-link">
                  메인
                </Link>
                <Link href="/erd-editor" className="global-nav-link">
                  ERD Editor
                </Link>
                <Link href="/api-docs" className="global-nav-link">
                  API DOCS Editor
                </Link>
                <Link href="/api-docs/view" className="global-nav-link">
                  API DOCS Viewer
                </Link>
              </nav>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
