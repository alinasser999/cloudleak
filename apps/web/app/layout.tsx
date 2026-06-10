import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, DotGothic16 } from "next/font/google";
import { Providers } from "./providers";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Pixel-grid display face — headings, hero, big figures.
const display = DotGothic16({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CloudLeak — Stop wasting money on AWS",
  description:
    "Connect your AWS account and get Terraform-ready fixes for cloud waste, with savings tracking.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
