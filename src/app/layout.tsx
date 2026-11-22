import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import CookieConsent from "@/components/Cookies";
import ProductAnalytics from "@/components/product-analytics/ProductAnalytics";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppResetProvider } from "@/components/providers/app-reset-provider";
import Header from "@/components/Header";
import Footer from "@/components/footer";
import HeaderTherapy from "@/components/HeaderTherapy";
import { SiteTextProvider } from "@/components/site-text/SiteTextProvider";
import { getPublishedTexts, getText } from "@/lib/site-texts/server";
import { meta } from "@/content/texts/meta";

// Titel und Beschreibungen sind im Admin-Editor bearbeitbar (src/content/texts/meta.ts).
export async function generateMetadata(): Promise<Metadata> {
  const published = await getPublishedTexts();
  // Wie bisher: NEXT_PUBLIC_PRODUCTNAME gilt, solange kein Admin einen Titel veröffentlicht hat.
  const title = published[meta["site.title"].key] ?? (process.env.NEXT_PUBLIC_PRODUCTNAME || meta["site.title"].text);
  const [description, shareTitle, shareDescription, shareImageAlt] = await Promise.all([
    getText(meta["site.description"]),
    getText(meta["share.title"]),
    getText(meta["share.description"]),
    getText(meta["share.imageAlt"]),
  ]);
  return {
    title,
    description,
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      url: "https://www.power-storys.de",
      siteName: "Power Storys",
      type: "website",
      images: [
        {
          url: "https://www.power-storys.de/images/og-image.webp",
          width: 1200,
          height: 630,
          alt: shareImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: ["https://www.power-storys.de/images/og-image.webp"],
    },
  };
}

// Bearbeitbare Texte: Seiten werden höchstens stündlich neu erzeugt, falls
// Supabase beim Erzeugen kurz nicht erreichbar war. Nach "Veröffentlichen" im
// Editor sofort (revalidateTag "site-texts").
export const revalidate = 3600;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Standard ist die tatsächliche Markenfarbigkeit (Amber). Vorher stand hier
  // "theme-sass3" (Ozeanblau), während die Oberfläche überall Amber verwendete.
  let theme = process.env.NEXT_PUBLIC_THEME
  if(!theme) {
    theme = "theme-powerstorys"
  }
  const gaID = process.env.NEXT_PUBLIC_GOOGLE_TAG;
  // Nur die vom Admin veröffentlichten Abweichungen – aus dem Cache, ohne DB-Abfrage.
  const publishedTexts = await getPublishedTexts();
  return (
    <html lang="de" suppressHydrationWarning>
    <body className={`${theme} min-h-screen flex flex-col`} suppressHydrationWarning>
      <AuthProvider>
        <SiteTextProvider published={publishedTexts}>
        <AppResetProvider>
          <Header />
          {/* <HeaderTherapy/> */}
          <main className="flex-1 min-h-0">
            {children}
          </main>

          <Footer />
          
          <Analytics />
          {/* <CookieConsent /> */}
          {/* PostHog-Funnel und Google Analytics – beides erst nach Einwilligung. */}
          <ProductAnalytics gaId={gaID} />
        </AppResetProvider>
        </SiteTextProvider>
      </AuthProvider>
    </body>
    </html>
  );
}          