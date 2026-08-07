import type { Metadata, Viewport } from "next";
import { basePath } from "../basePath";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9eef2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b111b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "System Design Interview Lab",
    template: "%s · System Design Interview Lab",
  },
  description:
    "A twelve-week active-recall workspace for distributed systems, ML system design, LLM infrastructure, estimation, and timed interview practice.",
  alternates: { canonical: siteUrl },
  // Next does not apply basePath to metadata icons, so prepend it here. Building
  // these from NEXT_PUBLIC_SITE_URL instead would point non-CI builds at localhost.
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
  openGraph: {
    type: "website",
    title: "System Design Interview Lab",
    description: "Turn technical depth into interview signal with a twelve-week practice system.",
    url: siteUrl,
    siteName: "System Design Interview Lab",
    images: [{ url: `${siteUrl}/og.png`, width: 1734, height: 907, alt: "System Design Interview Lab study workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Interview Lab",
    description: "Classic systems, ML, and LLM infrastructure—organized for active recall and timed practice.",
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
