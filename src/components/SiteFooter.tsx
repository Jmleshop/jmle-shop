import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="relative bg-gradient-to-b from-gold-dark via-jmle-orange-dark to-jmle-mahogany text-white py-14 px-4 md:px-8 mt-auto border-t border-amber-200/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Link
            href="/"
            className="font-display text-3xl tracking-[0.28em] text-jmle-yellow hover:text-white transition-colors"
          >
            jmle
          </Link>
          <p className="text-jmle-ocher/80 text-sm mt-2 font-ui font-light">
            أجود المنتجات العربية · Arabian Fine Foods
          </p>
          <div className="gold-divider !via-jmle-yellow/80 !mb-0 !mt-4" aria-hidden />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm mb-10">
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">المتجر</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  الفئات
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="hover:text-white transition-colors">
                  المفضلة
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-white transition-colors">
                  البحث
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">الحساب</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  تسجيل الدخول
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-white transition-colors">
                  إنشاء حساب
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">قانوني</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li>
                <Link href="/legal/impressum" className="hover:text-white transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/legal/datenschutz" className="hover:text-white transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/legal/widerruf" className="hover:text-white transition-colors">
                  Widerrufsbelehrung
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-ui text-jmle-yellow mb-3 font-medium">تواصل</h4>
            <ul className="space-y-2.5 text-white/70 font-body">
              <li dir="ltr">info@jmle.de</li>
              <li>Coswig (Anhalt), Deutschland</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/45 font-ui">
          <p>&copy; {new Date().getFullYear()} jmle. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
