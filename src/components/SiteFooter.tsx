import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-gradient-to-b from-gold-dark to-jmle-orange-dark text-white py-12 px-4 md:px-8 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-2xl font-light tracking-[0.3em] text-jmle-yellow"
          >
            jmle
          </Link>
          <p className="text-gray-400 text-sm mt-2 font-light">
            أجود المنتجات العربية
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-8">
          <div>
            <h4 className="text-jmle-yellow mb-3 font-medium">المتجر</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  الفئات
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
            <h4 className="text-jmle-yellow mb-3 font-medium">الحساب</h4>
            <ul className="space-y-2 text-gray-400">
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
            <h4 className="text-jmle-yellow mb-3 font-medium">قانوني</h4>
            <ul className="space-y-2 text-gray-400">
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
            <h4 className="text-jmle-yellow mb-3 font-medium">تواصل</h4>
            <ul className="space-y-2 text-gray-400">
              <li>info@jmle.de</li>
              <li>Coswig (Anhalt), Deutschland</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} jmle. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
