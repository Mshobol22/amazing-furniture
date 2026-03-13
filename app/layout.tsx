import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://amazinghomefurniturestore.com"
  ),
  verification: {
    google: "NlYP1pgeE7j5CzP4tZPsV5rUP6tNeVUIZUZ6If_x8CE",
  },
  title: {
    default: "Amazing Home Furniture — Premium Furniture for Every Room",
    template: "%s | Amazing Home Furniture",
  },
  description:
    "Shop 291 premium furniture pieces — sofas, beds, dining tables, chairs, cabinets and TV stands. Free shipping over $299.",
  keywords: [
    "furniture",
    "sofas",
    "sectionals",
    "beds",
    "dining tables",
    "home furniture",
    "recliners",
    "cabinets",
    "TV stands",
  ],
  openGraph: {
    type: "website",
    siteName: "Amazing Home Furniture",
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop 291 premium furniture pieces with free shipping over $299.",
    url: "https://amazinghomefurniturestore.com",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "https://amazinghomefurniturestore.com" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-cream text-charcoal antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
