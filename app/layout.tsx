import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--nf-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Markdown Converter",
  description: "Turn documents into clean Markdown.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
