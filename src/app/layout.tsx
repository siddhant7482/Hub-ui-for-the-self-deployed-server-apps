import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
