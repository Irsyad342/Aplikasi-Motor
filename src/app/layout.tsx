import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#101110" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
