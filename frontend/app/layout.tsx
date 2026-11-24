import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";

import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Estimasi Harga Rumah Ames | AVM",
  description:
    "Prototipe akademik Automated Valuation Model untuk estimasi harga rumah di Ames, Iowa (2006–2010).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${publicSans.variable} ${newsreader.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
