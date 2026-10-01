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
    close: "إغلاق",
    register: "إنشاء حساب",
    footerShop: "المتجر",
    footerAccount: "الحساب",
    footerLegal: "قانوني",
    footerContact: "تواصل",
    rights: "جميع الحقوق محفوظة.",
    tagline: "أجود المنتجات العربية · Arabian Fine Foods",
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
    cartDiscover: "اكتشف مجموعتنا الفاخرة",
    shopNow: "تسوق الآن",
    wishlistItemsCount: "{count} منتج محفوظ",
    wishlistUnavailable: "غير متوفر حالياً",
    tryAgain: "إعادة المحاولة",
    errorTitle: "حدث خطأ غير متوقع",
    errorHint: "حاول مرة أخرى أو عد إلى الصفحة الرئيسية.",
    loggedOut: "تم تسجيل الخروج",
    checkout: "إتمام الشراء",
    whatsapp: "الطلب عبر واتساب",
    searchPlaceholder: "ابحث عن منتج...",
    searchLabel: "بحث عن منتج",
    mainNav: "التنقل الرئيسي",
    wishlistCount: "المفضلة، {count} منتج",
    cartCount: "سلة التسوق، {count} منتج",
    langSwitch: "Deutsch",
    homeOffers: "عروض خاصة",
    homeBestsellers: "الأكثر مبيعاً",
    homeLatest: "أحدث المنتجات",
    homeFeatured: "عروض ومنتجات",
    shopByCategory: "تسوق على حسب الفئة",
    quickSearch: "بحث سريع",
    slidePrev: "الشريحة السابقة",
    slideNext: "الشريحة التالية",
    slideOf: "الشريحة {n}",
    pagePrev: "السابق",
    pageNext: "التالي",
    pageOf: "صفحة {page} من {pages}",
    pageLabel: "الصفحة {n}",
    brandPartners: "علاماتنا التجارية",
    brandProducts: "منتجات {brand}",
    brandEmpty: "لا توجد منتجات لهذه العلامة حالياً.",
    downloadImage: "تنزيل الصورة",
    allCategories: "جميع الفئات",
    noCategories: "لا توجد فئات",
    allProducts: "جميع المنتجات",
    productCount: "{count} منتج",
    noProducts: "لا توجد منتجات لعرضها حالياً.",
    subcategories: "الفئات الفرعية",
    saleCategory: "العروض",
    searchResults: "نتائج البحث: «{query}»",
    searchEmpty: "لا توجد نتائج.",
    checkoutTitle: "إتمام الشراء",
    orderSummary: "ملخص الطلب",
    payNow: "ادفع الآن · {total}",
    paying: "جاري التحويل...",
    backToCart: "العودة إلى السلة",
    backToShop: "العودة للتسوق",
    noCheckoutItems: "لا توجد منتجات للدفع",
    loading: "جاري التحميل...",
    checkoutSecure: "الدفع الآمن عبر Stripe · الأسعار شاملة ضريبة القيمة المضافة",
    stripeRedirect: "جاري التحويل إلى الدفع الآمن…",
    stripeError: "حدث خطأ أثناء الدفع",
    stripeConnectError: "تعذر الاتصال بخدمة الدفع",
    freeShipYes: "لديك شحن مجاني!",
    freeShipRemaining: "باقي {amount} للشحن المجاني",
    freeShipHint: "الشحن المجاني ابتداءً من {amount}",
    shippingProgress: "تقدم الشحن المجاني",
    discountLabel: "رمز الخصم",
    discountApply: "تطبيق",
    discountInvalid: "رمز الخصم غير صالح",
    discountEmpty: "الرجاء إدخال رمز الخصم",
    discountApplied: "تم تطبيق الخصم: −{amount}",
    discountFail: "تعذر التحقق من الرمز",
    discountRemove: "إزالة رمز الخصم",
    subtotal: "المجموع الفرعي",
    discountRow: "الخصم ({code})",
    shippingWeight: "وزن الشحن",
    shippingFree: "الشحن (مجاني)",
    shippingPaid: "الشحن (حسب الوزن)",
    total: "الإجمالي",
    vatNote: "شامل {food} ضريبة (7٪ مواد غذائية){shipping}",
    vatShipping: " و {amount} ضريبة (19٪ شحن)",
    vatIncluded: "شامل {rate}٪ ضريبة",
    thanksTitle: "شكراً لطلبك!",
    thanksBody:
      "تم استلام طلبك بنجاح. ستتلقى تأكيداً عبر البريد الإلكتروني. يمكنك متابعة طلبك وتنزيل الفاتورة من حسابك.",
    myOrders: "طلباتي",
    backHome: "العودة للرئيسية",
    outShort: "نفذ",
    lowStock: "متبقي {count}",
    inStock: "متوفر",
    qtyLabel: "الكمية",
    qtyDecrease: "تقليل الكمية",
    qtyIncrease: "زيادة الكمية",
    removeItem: "حذف",
    desc: "الوصف",
    ingredients: "المكونات",
    allergens: "مسببات الحساسية",
    legalPack: "التعبئة والسعر الأساسي",
    netWeight: "صافي الوزن: {value} {unit}",
    basePrice: "السعر الأساسي: {value}",
    bestBefore: "الحد الأدنى للصلاحية: {value}",
    wishlistAddedToast: "أضيف إلى المفضلة",
    wishlistRemovedToast: "تمت الإزالة من المفضلة",
    wishlistError: "تعذر الحفظ في المفضلة",
    halal: "حلال",
    organic: "عضوي",
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
    close: "Schließen",
    register: "Konto erstellen",
    footerShop: "Shop",
    footerAccount: "Konto",
    footerLegal: "Rechtliches",
    footerContact: "Kontakt",
    rights: "Alle Rechte vorbehalten.",
    tagline: "Arabische Feinkost · Arabian Fine Foods",
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
    cartDiscover: "Entdecke unser Sortiment",
    shopNow: "Jetzt einkaufen",
    wishlistItemsCount: "{count} gespeicherte Produkte",
    wishlistUnavailable: "Aktuell nicht verfügbar",
    tryAgain: "Erneut versuchen",
    errorTitle: "Etwas ist schiefgelaufen",
    errorHint: "Bitte versuche es erneut oder kehre zur Startseite zurück.",
    loggedOut: "Abgemeldet",
    checkout: "Zur Kasse",
    whatsapp: "Per WhatsApp bestellen",
    searchPlaceholder: "Produkt suchen...",
    searchLabel: "Produkt suchen",
    mainNav: "Hauptnavigation",
    wishlistCount: "Merkliste, {count} Produkte",
    cartCount: "Warenkorb, {count} Produkte",
    langSwitch: "العربية",
    homeOffers: "Angebote",
    homeBestsellers: "Bestseller",
    homeLatest: "Neueste Produkte",
    homeFeatured: "Angebote & Produkte",
    shopByCategory: "Nach Kategorie einkaufen",
    quickSearch: "Schnellsuche",
    slidePrev: "Vorherige Folie",
    slideNext: "Nächste Folie",
    slideOf: "Folie {n}",
    pagePrev: "Vorherige",
    pageNext: "Nächste",
    pageOf: "Seite {page} von {pages}",
    pageLabel: "Seite {n}",
    brandPartners: "Unsere Marken",
    brandProducts: "Produkte von {brand}",
    brandEmpty: "Für diese Marke sind derzeit keine Produkte vorhanden.",
    downloadImage: "Bild herunterladen",
    allCategories: "Alle Kategorien",
    noCategories: "Keine Kategorien",
    allProducts: "Alle Produkte",
    productCount: "{count} Produkte",
    noProducts: "Zurzeit sind keine Produkte vorhanden.",
    subcategories: "Unterkategorien",
    saleCategory: "Angebote",
    searchResults: "Suchergebnisse: „{query}“",
    searchEmpty: "Keine Treffer.",
    checkoutTitle: "Kasse",
    orderSummary: "Bestellübersicht",
    payNow: "Jetzt zahlen · {total}",
    paying: "Weiterleitung…",
    backToCart: "Zurück zum Warenkorb",
    backToShop: "Weiter einkaufen",
    noCheckoutItems: "Keine Artikel zur Kasse",
    loading: "Wird geladen…",
    checkoutSecure: "Sichere Zahlung über Stripe · Preise inkl. MwSt.",
    stripeRedirect: "Weiterleitung zur sicheren Zahlung…",
    stripeError: "Fehler beim Bezahlen",
    stripeConnectError: "Zahlungsdienst nicht erreichbar",
    freeShipYes: "Du hast kostenlosen Versand!",
    freeShipRemaining: "Noch {amount} bis zum kostenlosen Versand",
    freeShipHint: "Kostenloser Versand ab {amount}",
    shippingProgress: "Fortschritt Gratisversand",
    discountLabel: "Gutscheincode",
    discountApply: "Einlösen",
    discountInvalid: "Gutscheincode ungültig",
    discountEmpty: "Bitte einen Code eingeben",
    discountApplied: "Rabatt angewendet: −{amount}",
    discountFail: "Code konnte nicht geprüft werden",
    discountRemove: "Gutscheincode entfernen",
    subtotal: "Zwischensumme",
    discountRow: "Rabatt ({code})",
    shippingWeight: "Versandgewicht",
    shippingFree: "Versand (kostenlos)",
    shippingPaid: "Versand (nach Gewicht)",
    total: "Gesamt",
    vatNote: "inkl. {food} MwSt. (7 % Lebensmittel){shipping}",
    vatShipping: " und {amount} MwSt. (19 % Versand)",
    vatIncluded: "inkl. {rate} % MwSt.",
    thanksTitle: "Danke für deine Bestellung!",
    thanksBody:
      "Deine Bestellung ist eingegangen. Du erhältst eine Bestätigung per E-Mail. Bestellung und Rechnung findest du in deinem Konto.",
    myOrders: "Meine Bestellungen",
    backHome: "Zur Startseite",
    outShort: "Ausverkauft",
    lowStock: "Noch {count}",
    inStock: "Auf Lager",
    qtyLabel: "Menge",
    qtyDecrease: "Menge verringern",
    qtyIncrease: "Menge erhöhen",
    removeItem: "Entfernen",
    desc: "Beschreibung",
    ingredients: "Zutaten",
    allergens: "Allergene",
    legalPack: "Füllmenge & Grundpreis",
    netWeight: "Nettofüllmenge: {value} {unit}",
    basePrice: "Grundpreis: {value}",
    bestBefore: "Mindesthaltbarkeit: {value}",
    wishlistAddedToast: "Zur Merkliste hinzugefügt",
    wishlistRemovedToast: "Aus der Merkliste entfernt",
    wishlistError: "Merkliste konnte nicht gespeichert werden",
    halal: "Halal",
    organic: "Bio",
  },
} as const;

export type ShopMsgKey = keyof (typeof messages)["de"];

export function shopText(
  lang: ShopLang,
  key: ShopMsgKey,
  vars?: Record<string, string | number>
): string {
  let text: string = messages[lang][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

const ARABIC = /[\u0600-\u06FF]/;

export function productTitle(
  lang: ShopLang,
  product: { name: string; nameDe?: string | null }
): string {
  const ar = product.name?.trim() || "";
  const de = product.nameDe?.trim() || "";
  if (lang === "de") return de || ar;
  return ar || de;
}

export function categoryTitle(
  lang: ShopLang,
  category: { id?: string; name: string; nameEn?: string | null }
): string {
  if (category.id === "all") return shopText(lang, "allProducts");
  if (category.id === "sale") return shopText(lang, "saleCategory");
  const ar = category.name?.trim() || "";
  const de = category.nameEn?.trim() || "";
  if (lang === "de") return de || ar;
  return ar || de;
}

export function slideTitle(
  lang: ShopLang,
  slide: {
    title: string;
    titleAr?: string | null;
    titleDe?: string | null;
  }
): string {
  const ar = (slide.titleAr || slide.title || "").trim();
  const de = (slide.titleDe || "").trim();
  if (lang === "de") return de || ar;
  return ar || de;
}

export function slideSubtitle(
  lang: ShopLang,
  slide: {
    subtitle: string;
    subtitleAr?: string | null;
    subtitleDe?: string | null;
  }
): string {
  const ar = (slide.subtitleAr || slide.subtitle || "").trim();
  const de = (slide.subtitleDe || "").trim();
  if (lang === "de") return de || ar;
  return ar || de;
}

/** Picks the paragraph written in the active language when both scripts are stored. */
export function localizedField(
  lang: ShopLang,
  text: string | null | undefined
): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  const chunks = raw
    .split(/\n-{3,}\n|\n\|\|\n|\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (chunks.length < 2) return raw;
  const arabic = chunks.filter((part) => ARABIC.test(part));
  const german = chunks.filter((part) => !ARABIC.test(part));
  if (!arabic.length || !german.length) return raw;
  return (lang === "de" ? german : arabic).join("\n\n");
}
