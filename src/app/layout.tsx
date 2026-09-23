import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import SiteFooter from "@/components/SiteFooter";
import ConfettiBackground from "@/components/ConfettiBackground";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "jmle — أجود المنتجات العربية",
  description: "متجر jmle للمواد الغذائية العربية الأصيلة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${notoArabic.variable} font-arabic antialiased bg-jmle-cream text-luxury-black min-h-screen flex flex-col`}
      >
        <ConfettiBackground />
        <CartProvider>
          <Header />
          <main className="flex-1 pb-20">{children}</main>
          <SiteFooter />
          <FooterNav />
        </CartProvider>
      </body>
    </html>
  );
}
