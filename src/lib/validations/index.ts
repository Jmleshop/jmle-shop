import { z } from "zod";

/** Gemeinsame Hilfen für API-Routen */
export function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join("; ") || "Ungültige Eingabe";
}

export function parseJsonBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: zodErrorMessage(result.error) };
  }
  return { success: true, data: result.data };
}
