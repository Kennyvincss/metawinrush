import type { Metadata, Viewport } from "next";
import { Exo_2, Orbitron } from "next/font/google";
import "./globals.css";

const display = Orbitron({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-display" });
const body = Exo_2({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "METAWIN RUSH — Run. Collect. Compete. Win.",
  description: "A futuristic endless runner across eight neon cities. Swipe to dodge, collect META Coins, climb the leaderboards and conquer the Metawin Arena.",
  icons: { icon: "/brand/logo.jpg", apple: "/brand/logo.jpg" },
  manifest: "/manifest.webmanifest",
  openGraph: { title: "METAWIN RUSH", description: "Run. Collect. Compete. Win.", images: ["/brand/character.jpg"] },
  appleWebApp: { capable: true, title: "METAWIN RUSH", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05030b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
