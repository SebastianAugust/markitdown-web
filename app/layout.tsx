import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--nf-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--nf-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--nf-serif" });

export const metadata: Metadata = {
  title: "Markdown Converter",
  description: "Turn documents into clean Markdown.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
