import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "সরকারি বাঙলা কলেজ প্রাক্তন শিক্ষার্থীদের প্রথম মিলনমেলা-২০২৬ - ফটোকার্ড",
  description: "সরকারি বাংলা কলেজ প্রাক্তন শিক্ষার্থীদের প্রথম মিলনমেলা-২০২৬ এর ফটোকার্ড তৈরি করুন।",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
