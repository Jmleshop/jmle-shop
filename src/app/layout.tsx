import type { Metadata } from "next";
import { Amiri, Tajawal } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import FooterNav from "@/components/FooterNav";
import SiteFooterShell from "@/components/SiteFooterShell";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import ConfettiBackground from "@/components/ConfettiBackground";
import DevicePreviewToggle from "@/components/DevicePreviewToggle";
import PageViewTracker from "@/components/PageViewTracker";
import JsonLd from "@/components/JsonLd";
import { CartProvider } from "@/context/CartContext";
import { CartFlyProvider } from "@/context/CartFlyContext";
import { ShopLocaleProvider } from "@/components/ShopLocale";
import { sanitizeShopTexts } from "@/lib/shop-i18n";
import { WishlistProvider } from "@/context/WishlistContext";
import AppToaster from "@/components/AppToaster";
import { getAppUrl } from "@/lib/app-url";
import { getSiteConfigAsync } from "@/lib/catalog-server";
import {
  faviconMetadataIcons,
  resolveFaviconUrl,
} from "@/lib/favicon";
import { localBusinessJsonLd } from "@/lib/seo-jsonld";
import "./globals.css";

// Designsystem (Inhaber-Entscheidung 2026-10-26): Tajawal für Text/UI,
// Amiri nur für große Überschriften.
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

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await resolveFaviconUrl();
  return {
    metadataBase: new URL(getAppUrl()),
    title: {
      default: "jmle — مواد غذائية عربية في ألمانيا",
      template: "%s",
    },
    description:
      "متجر jmle للمواد الغذائية العربية في ألمانيا: بهارات، أرز، زيوت، فلافل والمزيد — أصيلة وتوصيل سريع.",
    keywords: [
      "مواد غذائية عربية",
      "سوبرماركت عربي ألمانيا",
      "arabische Lebensmittel",
      "Falafel",
      "Gewürze",
      "arabischer Supermarkt",
      "jmle",
      "Feinkost",
    ],
    icons: {
      ...faviconMetadataIcons(faviconUrl),
      // App Router file conventions (/icon, /apple-icon) as reliable fallbacks
      other: [
        { rel: "icon", url: "/icon" },
        { rel: "apple-touch-icon", url: "/apple-icon" },
      ],
    },
    openGraph: {
      type: "website",
      locale: "ar_DE",
      siteName: "jmle",
      title: "jmle — مواد غذائية عربية في ألمانيا",
      description:
        "اطلب المواد الغذائية العربية الأصيلة أونلاين — بهارات، أرز، زيوت والمزيد.",
    },
    twitter: {
      card: "summary_large_image",
      title: "jmle — مواد غذائية عربية",
      description:
        "اطلب المواد الغذائية العربية الأصيلة أونلاين من jmle.",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteConfigAsync();

  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${amiri.variable} ${tajawal.variable} font-arabic antialiased bg-jmle-cream text-luxury-black min-h-screen flex flex-col`}
      >
        <JsonLd data={localBusinessJsonLd(site)} />
        <ConfettiBackground />
        <CartProvider>
          <WishlistProvider>
            <ShopLocaleProvider overrides={sanitizeShopTexts(site.shopTexts)}>
            <CartFlyProvider>
            <AppToaster />
            <SiteHeader />
            <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
            <SiteFooterShell />
            <FooterNav />
            <WhatsAppWidget />
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
