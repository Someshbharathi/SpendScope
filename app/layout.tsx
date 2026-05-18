import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpendScope | AI Spend Optimization Platform",
  description:
    "Stop overspending on AI tools with automated spend audits. Analyze ChatGPT, Claude, and Gemini costs and discover realistic savings opportunities.",
  openGraph: {
    title: "SpendScope | AI Spend Optimization Platform",
    description: "Stop overspending on AI tools with automated spend audits.",
    url: "https://spend-scope-murex.vercel.app/",
    siteName: "SpendScope",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpendScope | AI Spend Optimization Platform",
    description: "Stop overspending on AI tools with automated spend audits.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
