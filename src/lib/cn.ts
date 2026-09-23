/** Einfache className-Hilfsfunktion (ohne Extra-Dependencies) */
export function cn(
  ...parts: Array<string | false | null | undefined | 0 | 0n | "">
): string {
  return parts.filter(Boolean).join(" ");
}
