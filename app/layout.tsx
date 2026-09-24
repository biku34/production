import type { Metadata, Viewport } from "next";
import "./globals.css";
import Shell from "@/components/Shell";
import ServiceWorker from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Fabric Plant — Production Module",
  description:
    "Production module for a fabric manufacturing plant — work orders, job board, stage tracking, lots/shades, QC, packing and dispatch.",
  applicationName: "Fabric Prod",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fabric Prod",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b7d54",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
        <ServiceWorker />
      </body>
    </html>
  );
}
