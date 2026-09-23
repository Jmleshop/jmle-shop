"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItemData {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({
  items,
  allowMultiple = false,
  className,
}: {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  className?: string;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.defaultOpen).map((i) => i.id))
  );

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("divide-y divide-amber-200/40 border border-amber-200/50 rounded-2xl overflow-hidden bg-white/80", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const panelId = `${baseId}-${item.id}-panel`;
        const btnId = `${baseId}-${item.id}-btn`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-start font-ui text-sm font-medium text-luxury-ink hover:bg-jmle-warm/60 transition-colors min-h-12"
              >
                <span>{item.title}</span>
                <ChevronDown
                  size={18}
                  className={cn(
                    "shrink-0 text-gold transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!isOpen}
              className={cn(
                "px-4 pb-4 text-sm text-gray-600 font-body leading-relaxed whitespace-pre-wrap",
                isOpen && "animate-fade-up"
              )}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
