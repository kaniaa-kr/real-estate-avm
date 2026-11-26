import type { Metadata } from "next";
import { Fredoka, Newsreader, Nunito, Public_Sans } from "next/font/google";

import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

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
      className={`${fredoka.variable} ${nunito.variable} ${publicSans.variable} ${newsreader.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
