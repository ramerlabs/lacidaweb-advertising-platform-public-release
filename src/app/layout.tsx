import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSiteSettings } from "@/lib/site-settings";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = `${settings.title} — ${settings.product}`;
  const ogImage = "/branding/og.png";
  return {
    title,
    description: settings.description,
    metadataBase: new URL(settings.url),
    icons: {
      icon: [
        { url: "/icon", type: "image/png", sizes: "32x32" },
        { url: "/branding/icon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-icon",
    },
    openGraph: {
      title,
      description: settings.description,
      url: settings.url,
      siteName: settings.title,
      images: [{ url: ogImage, width: 1200, height: 630, alt: settings.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: settings.description,
      images: [ogImage],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${sans.className} ${sans.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
