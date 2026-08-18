import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WalletBridge } from "@/components/WalletBridge";
import { counts } from "@/lib/catalog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const description =
  `A storefront for ${counts.listed} pieces of shipped software, sorted onto two shelves: ` +
  `tools you operate, and projects with a thesis. Every listing links to something you can open.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://colonnade.vercel.app"),
  title: {
    default: "Colonnade — the shipped work, on one shelf",
    template: "%s · Colonnade",
  },
  description,
  keywords: ["software catalogue", "developer portfolio", "Solana", "web tools", "shipped work"],
  authors: [{ name: "Bryan Kwandou" }],
  openGraph: {
    type: "website",
    title: "Colonnade — the shipped work, on one shelf",
    description,
    siteName: "Colonnade",
  },
  twitter: { card: "summary_large_image", title: "Colonnade", description },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brass-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-shadow-900"
        >
          Skip to content
        </a>
        <WalletBridge>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </WalletBridge>
      </body>
    </html>
  );
}
