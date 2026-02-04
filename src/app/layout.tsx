import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import CookieConsent from "@/components/Cookies";
import { GoogleAnalytics } from '@next/third-parties/google'
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppResetProvider } from "@/components/providers/app-reset-provider";
import Header from "@/components/Header";
import Footer from "@/components/footer";
import HeaderTherapy from "@/components/HeaderTherapy";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_PRODUCTNAME || "Power Storys",
  description: "Kurz innehalten, zuhören und spüren – Geschichten für mehr Entspannung im Alltag.",
  openGraph: {
    title: "Finde innere Ruhe mit Power Storys",
    description: "Kurz innehalten, zuhören und spüren – Geschichten für mehr Entspannung im Alltag.",
    url: "https://www.power-storys.de",
    siteName: "Power Storys",
    type: "website",
    images: [
      {
        url: "https://www.power-storys.de/images/power-storys_logo.webp",
        width: 1200,
        height: 630,
        alt: "Power Storys - Finde innere Ruhe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finde innere Ruhe mit Power Storys",
    description: "Kurz innehalten, zuhören und spüren – Geschichten für mehr Entspannung im Alltag.",
    images: ["https://www.power-storys.de/images/power-storys_logo.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme = process.env.NEXT_PUBLIC_THEME
  if(!theme) {
    theme = "theme-sass3"
  }
  const gaID = process.env.NEXT_PUBLIC_GOOGLE_TAG;
  return (
    <html lang="de" suppressHydrationWarning>
    <body className={`${theme} min-h-screen flex flex-col`} suppressHydrationWarning>
      <AuthProvider>
        <AppResetProvider>
          <Header />
          {/* <HeaderTherapy/> */}
          <main className="flex-1">
            {children}
          </main>

          <Footer />
          
          <Analytics />
          {/* <CookieConsent /> */}
          { gaID && (
            <GoogleAnalytics gaId={gaID}/>
          )}
        </AppResetProvider>
      </AuthProvider>
    </body>
    </html>
  );
}          