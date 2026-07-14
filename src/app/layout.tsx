import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/data";
import { AmplifyProvider } from "@/components/amplify-provider";
import { StructuredData } from "@/components/seo/structured-data";
import { ThemeScript } from "@/components/theme-script";
import { readAmplifyOutputs } from "@/lib/read-amplify-outputs";

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
  },
  // Twitter card metadata (used by Twitter, Discord, Slack, etc.)
  twitter: {
    card: "summary",
    title: site.metadata.title,
    description: site.metadata.description,
    creator: site.metadata.socialHandle,
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
  const amplifyOutputs = readAmplifyOutputs();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <ThemeScript />
        <StructuredData />
      </head>
      <body className="antialiased">
        <AmplifyProvider outputs={amplifyOutputs}>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
