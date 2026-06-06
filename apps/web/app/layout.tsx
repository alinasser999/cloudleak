import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "CloudLeak — Stop wasting money on AWS",
  description:
    "Connect your AWS account and get Terraform-ready fixes for cloud waste, with savings tracking.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
