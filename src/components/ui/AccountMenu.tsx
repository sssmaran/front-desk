"use client";
// The avatar button on the right of the top bar and the small menu it opens.
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Me } from "@/components/auth";

const ACCESS: Record<Me["role"], string> = {
  admin: "Can see visitor names and details, and who has access.",
  viewer: "Can see visit counts and busy times. Visitor names are hidden.",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function AccountMenu({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const path = usePathname();

  useEffect(() => setOpen(false), [path]); // close when navigating

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const roleLabel = me.role === "admin" ? "Admin" : "Viewer";

  return (
    <div className="account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account: ${me.name}, ${roleLabel}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar" aria-hidden>{initials(me.name)}</span>
        <svg className="chevron" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div id={menuId} className="account-menu" data-open={open} inert={!open}>
        <div className="account-head">
          <span className="avatar lg" aria-hidden>{initials(me.name)}</span>
          <div>
            <span className="account-name">{me.name}</span>
            <span className="account-email">{me.email}</span>
            <span className={`role role-${me.role}`}>{roleLabel}</span>
          </div>
        </div>
        <p className="account-access">{ACCESS[me.role]}</p>
        <button type="button" className="account-signout" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
