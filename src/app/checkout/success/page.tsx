import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <CheckCircle size={64} className="text-green-600 mb-6" />
      <h1 className="text-3xl font-light mb-3 tracking-wide">
        شكراً لطلبك!
      </h1>
      <p className="text-gray-500 mb-8 max-w-md">
        تم استلام طلبك بنجاح. ستتلقى تأكيداً عبر البريد الإلكتروني.
      </p>
      <Link href="/" className="btn-primary">
        العودة للرئيسية
      </Link>
    </div>
  );
}
