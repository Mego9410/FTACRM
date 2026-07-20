import type { Metadata } from "next";
import { Hanken_Grotesk, Lora } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
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
  title: { default: "Vantage", template: "%s · Vantage" },
  description: "Vantage — Frank Taylor & Associates practice sales CRM",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${hanken.variable} ${lora.variable}`}>
      <body>
        <NextTopLoader
          color="#E4AD25"
          height={3}
          showSpinner={false}
          shadow="0 0 8px #E4AD25, 0 0 4px #E4AD25"
          crawlSpeed={160}
          speed={280}
        />
        {children}
      </body>
    </html>
  );
}
