/**
 * Root Layout
 * 
 * This is the root layout for the entire Next.js application.
 * It wraps all pages with global styles and fonts.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load Geist font family for modern, clean typography
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO metadata for the dashboard
export const metadata: Metadata = {
  title: "Omel AI Dashboard",
  description: "The Final Safety Layer - Protect your dealership from AI chatbot liability",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
