export type NumberRow = {
  id: string;
  name_ar: string;
  product_number: string | null;
  created_at: string;
};

export type NumberPlan = {
  id: string;
  name: string;
  from: string;
  to: string;
};

export function planProductNumbers(rows: NumberRow[]): NumberPlan[] {
  const sorted = [...rows].sort((a, b) => {
    const time = a.created_at.localeCompare(b.created_at);
    return time || a.id.localeCompare(b.id);
  });
  return sorted.map((row, index) => ({
    id: row.id,
    name: row.name_ar,
    from: row.product_number ?? "",
    to: String(index + 1),
  }));
}

export function nextProductNumber(current: (string | null | undefined)[]): string {
  let max = 0;
  for (const value of current) {
    const text = String(value ?? "").trim();
    if (/^\d+$/.test(text)) max = Math.max(max, Number(text));
  }
  return String(max + 1);
}
