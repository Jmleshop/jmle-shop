import Link from "next/link";

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
        className="text-sm text-gold hover:underline mb-6 inline-block"
      >
        ← Zurück
      </Link>
      <h1 className="text-3xl font-light mb-8 tracking-wide">{title}</h1>
      {children}
    </div>
  );
}
