import type { Metadata } from "next";
import { Hanken_Grotesk, Lora } from "next/font/google";
import "@/styles/globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700", "800"],
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "FTA CRM", template: "%s · FTA CRM" },
  description: "Frank Taylor & Associates — practice sales CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${hanken.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
