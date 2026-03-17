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
    "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Flexible financing available.",
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
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Flexible financing available.",
    url: "https://amazinghomefurniturestore.com",
    siteName: "Amazing Home Furniture",
    type: "website",
    images: [
      {
        url: "https://amazinghomefurniturestore.com/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "Amazing Home Furniture — Premium Furniture for Every Room",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Flexible financing available.",
    images: ["https://amazinghomefurniturestore.com/og-image.png?v=2"],
  },
  alternates: { canonical: "https://amazinghomefurniturestore.com" },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "FurnitureStore",
  name: "Amazing Home Furniture",
  url: "https://amazinghomefurniturestore.com",
  logo: "https://amazinghomefurniturestore.com/logo.png",
  image: "https://amazinghomefurniturestore.com/og-image.png",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "orders@amazinghomefurniturestore.com",
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="font-body bg-cream text-charcoal antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
