import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import CookieConsent from "@/components/Cookies";
import { GoogleAnalytics } from '@next/third-parties/google'
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppResetProvider } from "@/components/providers/app-reset-provider";
import Header from "@/components/Header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_PRODUCTNAME,
  description: "The best way to build your SaaS product.",
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
    <html lang="de">
    <body className={`${theme} min-h-screen flex flex-col`}>
      <AuthProvider>
        <AppResetProvider>
          <Header />
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