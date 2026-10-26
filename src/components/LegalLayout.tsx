import Link from "next/link";

/**
 * Rechtstexte bleiben deutsch (Inhaber-Entscheidung 2026-10-26): arabischer Rahmen,
 * der Text selbst als deutscher LTR-Block.
 */
export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <Link
        href="/"
        className="text-sm text-orange-800 hover:underline mb-4 inline-flex min-h-11 items-center"
      >
        → العودة إلى المتجر
      </Link>
      <p className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-gray-700">
        هذا النص القانوني متوفر باللغة الألمانية فقط، وهي النسخة الملزمة.
      </p>
      <article lang="de" dir="ltr" className="text-left">
        <h1 className="font-ui text-3xl font-medium mb-8">{title}</h1>
        {children}
      </article>
    </div>
  );
}
