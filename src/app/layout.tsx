import type { Metadata, Viewport } from "next";
import { Inter, Raleway, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const raleway = Raleway({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mypr.pro.bd"),
  title: {
    default: "MyPR",
    template: "%s | MyPR",
  },
  description: "MyPR helps developers turn merged pull requests into a public portfolio they can share anywhere.",
  keywords: [
    "MyPR",
    "pull request portfolio",
    "developer portfolio",
    "GitHub pull requests",
    "merged PR timeline",
    "open source contributions",
    "engineering portfolio",
    "shareable PR profile",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MyPR",
    description: "MyPR helps developers turn merged pull requests into a public portfolio they can share anywhere.",
    url: "https://mypr.pro.bd",
    siteName: "MyPR",
    type: "website",
    images: [
      {
        url: "/og-placeholder.jpg",
        width: 1200,
        height: 630,
        alt: "MyPR social sharing placeholder image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyPR",
    description: "MyPR helps developers turn merged pull requests into a public portfolio they can share anywhere.",
    images: ["/og-placeholder.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${raleway.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
