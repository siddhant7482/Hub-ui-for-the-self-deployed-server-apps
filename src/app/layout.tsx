import type { Metadata, Viewport } from "next";
import { Figtree, DM_Mono } from "next/font/google";
import "./globals.css";

/* Nothing shared with Warden on purpose. Warden is a ledger; the deck
 * is an instrument. If they share a typeface they read as one app. */
const sans = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "800", "900"], variable: "--font-sans" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CommandHQ",
  description: "The front door.",
};

/* Without this a phone lays the page out at ~980px and scales it down,
 * which is why the deck looked cropped rather than responsive. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101114",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
