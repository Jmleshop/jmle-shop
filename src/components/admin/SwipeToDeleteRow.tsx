"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

const THRESHOLD = 96;
const MAX_DRAG = 140;

/**
 * Swipe-nach-rechts → Soft-Delete-Geste (Admin).
 * Bestehende Aktions-Buttons bleiben im children erhalten.
 * Keine Datenänderung — nur Callback an Parent (Soft Delete).
 */
export default function SwipeToDeleteRow({
  children,
  onSwipeDelete,
  disabled = false,
  className,
  label = "In Papierkorb",
}: {
  children: ReactNode;
  /** Return false to abort exit animation (z. B. API-Fehler) */
  onSwipeDelete: () => boolean | void | Promise<boolean | void>;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const x = useMotionValue(0);
  const [exiting, setExiting] = useState(false);
  const [height, setHeight] = useState<number | "auto">("auto");
  const rowRef = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  const reset = () => {
    void animate(x, 0, { type: "spring", stiffness: 420, damping: 36 });
  };

  const commitDelete = async () => {
    if (triggered.current || disabled) return;
    triggered.current = true;
    const h = rowRef.current?.offsetHeight ?? 56;
    setHeight(h);
    setExiting(true);
    void animate(x, MAX_DRAG, { duration: 0.15 });

    try {
      const result = await onSwipeDelete();
      if (result === false) {
        setExiting(false);
        setHeight("auto");
        triggered.current = false;
        reset();
      }
    } catch {
      setExiting(false);
      setHeight("auto");
      triggered.current = false;
      reset();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (disabled || exiting) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > THRESHOLD || velocity > 700) {
      void commitDelete();
    } else {
      reset();
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={rowRef}
      className={cn("relative overflow-hidden select-none", className)}
      style={{ height: exiting ? height : "auto" }}
      animate={
        exiting
          ? { height: 0, opacity: 0 }
          : { opacity: 1 }
      }
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0 flex items-center justify-start gap-2 px-5 bg-red-600 text-white"
        aria-hidden
      >
        <Trash2 size={20} />
        <span className="text-sm font-medium">{label}</span>
      </div>

      <motion.div
        drag={exiting ? false : "x"}
        dragConstraints={{ left: 0, right: MAX_DRAG }}
        dragElastic={0.08}
        dragDirectionLock
        style={{ x }}
        onDragEnd={onDragEnd}
        className="relative z-[1] bg-white touch-pan-y cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
