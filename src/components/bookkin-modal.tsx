"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "summary",
].join(",");

export function BookkinModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = document.querySelector<HTMLElement>("[data-bookkin-shell-content]");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    background?.setAttribute("inert", "");
    background?.setAttribute("aria-hidden", "true");
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(focusableSelector);
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || dialog === null) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((control) => control.offsetParent !== null);
      if (controls.length === 0) return;
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      background?.removeAttribute("inert");
      background?.removeAttribute("aria-hidden");
      const focusTarget = returnTarget?.isConnected ? returnTarget : document.querySelector<HTMLElement>(".bk-fab");
      focusTarget?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div
      className="bk-modal-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section aria-labelledby={titleId} aria-modal="true" className="bk-modal" ref={dialogRef} role="dialog">
        <header className="bk-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button aria-label={`Close ${title}`} className="bk-icon-button" onClick={onClose} type="button">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
