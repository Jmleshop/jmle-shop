import { cn } from "@/lib/cn";

/**
 * Einheitliche Abschnitts-Überschrift für den Shop (Kategorien, Marken,
 * Produkte, Banner): gleiche Schrift, Größe, Abstände und immer der
 * orange Strich darunter. Größe/Farbe/Ausrichtung steuert `.section-title`
 * bzw. der Page-Builder über CSS-Variablen — nicht pro Komponente.
 */
export default function SectionHeading({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  const heading = (text ?? "").trim();
  if (!heading) return null;
  return (
    <div className={cn("layout-section-title-wrap section-heading", className)}>
      <h2 className="section-title">{heading}</h2>
      <div className="gold-divider" aria-hidden />
    </div>
  );
}
