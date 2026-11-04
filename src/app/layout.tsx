import type { Metadata } from "next";
import "@/styles/tokens.css";
import "@/styles/layout.css";
import "@/styles/motion.css";
import { AuthProvider } from "@/components/auth";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "The Front Desk",
  description: "Lobby sign-ins for the Brightline office",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <AuthProvider>
          <Nav />
          <main id="main-content" tabIndex={-1}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
