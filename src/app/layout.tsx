import type { Metadata } from "next";
import { Michroma } from "next/font/google";
import "./globals.css";
import { site } from "@/data";
import { StructuredData } from "@/components/seo/structured-data";

const michroma = Michroma({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: site.metadata.title,
  description: site.metadata.description,
  authors: [{ name: site.metadata.author }],
  creator: site.metadata.author,
  metadataBase: new URL(site.metadata.siteUrl),
  alternates: {
    canonical: site.metadata.siteUrl,
  },
  openGraph: {
    title: site.metadata.title,
    description: site.metadata.description,
    url: site.metadata.siteUrl,
    siteName: site.brandName,
    locale: site.locale,
    type: "website",
    images: [
      {
        url: "/og-image.jpg", // TODO: Add actual OG image at 1200x630px
        width: 1200,
        height: 630,
        alt: site.metadata.title,
      },
    ],
  },
  // Twitter card metadata (used by Twitter, Discord, Slack, etc.)
  twitter: {
    card: "summary_large_image",
    title: site.metadata.title,
    description: site.metadata.description,
    creator: site.metadata.socialHandle,
    images: ["/og-image.jpg"], // TODO: Add actual OG image at 1200x630px
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Additional metadata for better SEO
  keywords: ["AI consultant", "data consultant", "photography", "portfolio", "hasha dar"],
  category: "portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <StructuredData />
      </head>
      <body className={`${michroma.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
