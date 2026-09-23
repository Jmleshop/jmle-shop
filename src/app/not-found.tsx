import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-light text-gold mb-4">404</h1>
      <p className="text-xl font-light mb-2">الصفحة غير موجودة</p>
      <p className="text-gray-500 text-sm mb-8">
        عذراً، لم نتمكن من العثور على الصفحة المطلوبة
      </p>
      <Link href="/" className="btn-primary">
        العودة للرئيسية
      </Link>
    </div>
  );
}
