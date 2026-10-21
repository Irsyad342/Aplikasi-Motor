import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RideCheck — Pelacak Perawatan Motor",
  description:
    "Pantau kondisi komponen motor Anda, catat servis, lacak perjalanan, dan temukan bengkel terdekat di Pulau Jawa.",
  keywords: ["RideCheck", "perawatan motor", "servis motor", "pelacak komponen", "bengkel"],
  manifest: "/manifest.webmanifest",
  applicationName: "RideCheck",
  appleWebApp: {
    capable: true,
    title: "RideCheck",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/images/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/images/app-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f2f3f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
