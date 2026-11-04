"use client";
// A small "i" button that reveals an explanation. Opens on hover, keyboard focus
// or tap, and closes on Escape — so it works with a mouse, keyboard and touch.
import { useEffect, useId, useRef, useState } from "react";

const HOVER_DELAY_MS = 150; // avoid flicker when the pointer just passes over

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipId = useId();

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      className="infotip"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        clear();
        timer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        clear();
        setOpen(false);
      }}
    >
      <button
        type="button"
        className="infotip-trigger"
        aria-label={label}
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      <span id={tipId} role="tooltip" className="infotip-bubble" data-open={open}>
        {children}
      </span>
    </span>
  );
}
