import type { Metadata } from "next";
import { Amiri, Noto_Sans_Arabic, Tajawal } from "next/font/google";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import SiteFooter from "@/components/SiteFooter";
import ConfettiBackground from "@/components/ConfettiBackground";
import DevicePreviewToggle from "@/components/DevicePreviewToggle";
import PageViewTracker from "@/components/PageViewTracker";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import AppToaster from "@/components/AppToaster";
import { getAppUrl } from "@/lib/app-url";
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
    default: "jmle — أجود المنتجات العربية",
    template: "%s",
  },
  description: "متجر jmle للمواد الغذائية العربية الأصيلة",
  openGraph: {
    type: "website",
    locale: "ar_DE",
    siteName: "jmle",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${notoArabic.variable} ${amiri.variable} ${tajawal.variable} font-arabic antialiased bg-jmle-cream text-luxury-black min-h-screen flex flex-col`}
      >
        <ConfettiBackground />
        <CartProvider>
          <WishlistProvider>
            <AppToaster />
            <Header />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <SiteFooter />
            <FooterNav />
            <DevicePreviewToggle />
            <PageViewTracker />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
