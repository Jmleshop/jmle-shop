export type ShopLang = "ar" | "de";

const messages = {
  ar: {
    home: "الرئيسية",
    products: "جميع المنتجات",
    categories: "الفئات",
    wishlist: "المفضلة",
    cart: "السلة",
    search: "البحث",
    account: "الملف الشخصي",
    login: "تسجيل الدخول",
    menu: "القائمة",
    searchBtn: "بحث",
    addToCart: "أضف للسلة",
    added: "تمت الإضافة",
    outOfStock: "نفذ من المخزون",
    wishlistAdd: "أضف إلى المفضلة",
    wishlistRemove: "إزالة من المفضلة",
    wishlistTitle: "المفضلة",
    wishlistEmpty: "قائمة المفضلة فارغة — اضغط على ♥ عند أي منتج",
    wishlistSaved: "منتج محفوظ",
    browse: "تصفح المنتجات",
    clearAll: "مسح الكل",
    cartTitle: "سلة التسوق",
    cartEmpty: "سلة التسوق فارغة",
    checkout: "إتمام الشراء",
    whatsapp: "الطلب عبر واتساب",
    langSwitch: "Deutsch",
  },
  de: {
    home: "Start",
    products: "Alle Produkte",
    categories: "Kategorien",
    wishlist: "Merkliste",
    cart: "Warenkorb",
    search: "Suche",
    account: "Konto",
    login: "Anmelden",
    menu: "Menü",
    searchBtn: "Suche",
    addToCart: "In den Warenkorb",
    added: "Hinzugefügt",
    outOfStock: "Ausverkauft",
    wishlistAdd: "Zur Merkliste",
    wishlistRemove: "Aus Merkliste entfernen",
    wishlistTitle: "Merkliste",
    wishlistEmpty: "Die Merkliste ist leer — tippe auf das Herz bei einem Produkt.",
    wishlistSaved: "Gespeichertes Produkt",
    browse: "Produkte ansehen",
    clearAll: "Alles entfernen",
    cartTitle: "Warenkorb",
    cartEmpty: "Der Warenkorb ist leer",
    checkout: "Zur Kasse",
    whatsapp: "Per WhatsApp bestellen",
    langSwitch: "العربية",
  },
} as const;

export type ShopMsgKey = keyof (typeof messages)["de"];

export function shopText(lang: ShopLang, key: ShopMsgKey): string {
  return messages[lang][key];
}

export function productTitle(
  lang: ShopLang,
  product: { name: string; nameDe?: string | null }
): string {
  if (lang === "de") return product.nameDe?.trim() || product.name;
  return product.name;
}
