import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&family=Orbitron:wght@500;700;900&display=swap" />
      </head>
      <body className="min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
