import Link from "next/link";

interface ProductPaginationProps {
  page: number;
  pages: number;
  /** Path without query, e.g. /products */
  href: string;
  /** Extra query params kept across pages (without page). */
  query?: Record<string, string | undefined>;
}

function hrefFor(base: string, page: number, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default function ProductPagination({ page, pages, href, query }: ProductPaginationProps) {
  if (pages <= 1) return null;

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(pages, windowStart + 4);
  const numbers: number[] = [];
  for (let n = Math.max(1, windowEnd - 4); n <= windowEnd; n++) numbers.push(n);

  const linkClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-amber-200/70 px-3 text-sm font-ui text-luxury-ink hover:border-brand-orange hover:text-brand-orange";

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 pb-12" aria-label="Seiten">
      {page > 1 ? (
        <Link href={hrefFor(href, page - 1, query)} className={linkClass} rel="prev">
          ‹
        </Link>
      ) : null}
      {numbers.map((n) =>
        n === page ? (
          <span
            key={n}
            aria-current="page"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-brand-orange px-3 text-sm font-ui text-white"
          >
            {n}
          </span>
        ) : (
          <Link key={n} href={hrefFor(href, n, query)} className={linkClass}>
            {n}
          </Link>
        )
      )}
      {page < pages ? (
        <Link href={hrefFor(href, page + 1, query)} className={linkClass} rel="next">
          ›
        </Link>
      ) : null}
    </nav>
  );
}
