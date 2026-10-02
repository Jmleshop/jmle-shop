import type { Metadata } from "next";
import { Amiri, Noto_Sans_Arabic, Tajawal } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import FooterNav from "@/components/FooterNav";
import SiteFooterShell from "@/components/SiteFooterShell";
import ConfettiBackground from "@/components/ConfettiBackground";
import DevicePreviewToggle from "@/components/DevicePreviewToggle";
import PageViewTracker from "@/components/PageViewTracker";
import JsonLd from "@/components/JsonLd";
import { CartProvider } from "@/context/CartContext";
import { CartFlyProvider } from "@/context/CartFlyContext";
import { ShopLocaleProvider } from "@/components/ShopLocale";
import { WishlistProvider } from "@/context/WishlistContext";
import AppToaster from "@/components/AppToaster";
import { getAppUrl } from "@/lib/app-url";
import { getSiteConfigAsync } from "@/lib/catalog-server";
import { localBusinessJsonLd } from "@/lib/seo-jsonld";
import "./globals.css";

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  weight: ["400", "700"],
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "jmle — Arabische Lebensmittel & Feinkost",
    template: "%s",
  },
  description:
    "jmle Onlineshop für arabische Lebensmittel: Gewürze, Reis, Öle, Falafel & mehr — frisch, authentisch, schnell geliefert in Deutschland.",
  keywords: [
    "arabische Lebensmittel",
    "Falafel",
    "Gewürze",
    "arabischer Supermarkt",
    "jmle",
    "Feinkost",
  ],
  openGraph: {
    type: "website",
    locale: "ar_DE",
    siteName: "jmle",
    title: "jmle — Arabische Lebensmittel & Feinkost",
    description:
      "Authentische arabische Lebensmittel online bestellen — Gewürze, Reis, Öle und mehr.",
  },
  twitter: {
    card: "summary_large_image",
    title: "jmle — Arabische Lebensmittel",
    description:
      "Authentische arabische Lebensmittel online bestellen bei jmle.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteConfigAsync();

  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${notoArabic.variable} ${amiri.variable} ${tajawal.variable} font-arabic antialiased bg-jmle-cream text-luxury-black min-h-screen flex flex-col`}
      >
        <JsonLd data={localBusinessJsonLd(site)} />
        <ConfettiBackground />
        <CartProvider>
          <WishlistProvider>
            <ShopLocaleProvider>
            <CartFlyProvider>
            <AppToaster />
            <SiteHeader />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <SiteFooterShell />
            <FooterNav />
            <DevicePreviewToggle />
            <PageViewTracker />
            </CartFlyProvider>
            </ShopLocaleProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
