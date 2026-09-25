"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Mehrfachauswahl für Tabellen/Listen:
 * - Einzel-Toggle
 * - "Alle auswählen" (toggleAll)
 * - Shift-Klick für Bereichsauswahl (Anker = letzter Klick)
 */
export function useRowSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastIndex = useRef<number | null>(null);

  const clear = useCallback(() => {
    setSelected(new Set());
    lastIndex.current = null;
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  /** Klick auf eine Zeilen-Checkbox; shiftKey wählt den Bereich seit dem letzten Klick. */
  const onSelect = useCallback(
    (orderedIds: string[], index: number, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const id = orderedIds[index];
        if (shiftKey && lastIndex.current !== null) {
          const a = Math.min(lastIndex.current, index);
          const b = Math.max(lastIndex.current, index);
          for (let i = a; i <= b; i++) next.add(orderedIds[i]);
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastIndex.current = index;
    },
    []
  );

  const allSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id)),
    [selected]
  );

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const everyone = ids.length > 0 && ids.every((id) => prev.has(id));
      return everyone ? new Set() : new Set(ids);
    });
    lastIndex.current = null;
  }, []);

  return {
    selected,
    setSelected,
    clear,
    isSelected,
    onSelect,
    allSelected,
    toggleAll,
  };
}
