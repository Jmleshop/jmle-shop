export const PRODUCT_PAGE_SIZE = 24;

export function pageFromSearchParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function paginateProducts<T>(items: T[], page: number, pageSize = PRODUCT_PAGE_SIZE) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pages,
    total,
  };
}
