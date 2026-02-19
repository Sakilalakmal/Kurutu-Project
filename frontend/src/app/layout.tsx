import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const landingSans = Manrope({
  variable: "--font-landing-sans",
  subsets: ["latin"],
});

const landingSerif = Cormorant_Garamond({
  variable: "--font-landing-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const landingMono = Manrope({
  variable: "--font-landing-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kurutu Draw | Diagram and Wireframe Canvas",
    template: "%s | Kurutu Draw",
  },
  description:
    "Kurutu Draw helps product teams sketch flows, build wireframes, connect logic, and share clear diagrams from one canvas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${landingSans.variable} ${landingSerif.variable} ${landingMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
