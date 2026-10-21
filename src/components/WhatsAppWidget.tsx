"use client";

import { usePathname } from "next/navigation";
import { useShopLocale } from "@/components/ShopLocale";
import { WHATSAPP_E164 } from "@/lib/whatsapp-order";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 fill-current">
      <path d="M20.5 3.5A11 11 0 0 0 2.1 16.7L1 23l6.5-1.1A11 11 0 0 0 20.5 3.5Zm-8.5 17a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.9.6.6-3.8-.2-.3A9.1 9.1 0 1 1 12 20.5Zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.2-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

export default function WhatsAppWidget() {
  const pathname = usePathname();
  const { lang } = useShopLocale();
  if (pathname.startsWith("/admin")) return null;

  const ar = lang === "ar";
  const label = ar ? "تحدث معنا عبر الواتساب 💬" : "Sprechen Sie mit uns über WhatsApp 💬";
  const text = ar
    ? "السلام عليكم، لدي استفسار حول المنتجات في المتجر"
    : "Hallo! Ich habe eine Frage zu den Produkten im Shop.";
  const href = `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`fixed z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-ui font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#20ba5a] bottom-24 md:bottom-6 ${
        ar ? "left-6" : "right-6"
      }`}
    >
      <WhatsAppIcon />
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
