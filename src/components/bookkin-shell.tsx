"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { FamilyShelfItem } from "@/application/family-books/family-shelf";
import { AddBookDialog } from "@/components/add-book-dialog";
import { QuickLogDialog } from "@/components/quick-log-dialog";

type CaptureView = "add" | "log";

type BookkinShellContextValue = {
  shelf: FamilyShelfItem[];
  isShelfLoading: boolean;
  shelfError?: string;
  refreshShelf: () => Promise<void>;
  openAdd: () => void;
  openLog: () => void;
};

const BookkinShellContext = createContext<BookkinShellContextValue | undefined>(undefined);

export function useBookkinShell() {
  const context = useContext(BookkinShellContext);
  if (context === undefined) throw new Error("useBookkinShell must be used inside BookkinShell");
  return context;
}

export function BookkinShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [shelf, setShelf] = useState<FamilyShelfItem[]>([]);
  const [isShelfLoading, setIsShelfLoading] = useState(true);
  const [shelfError, setShelfError] = useState<string>();
  const [capture, setCapture] = useState<CaptureView>();
  const [fanOpen, setFanOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [toast, setToast] = useState<{ message: string; canLogAnother: boolean }>();
  const fabRef = useRef<HTMLButtonElement>(null);

  const refreshShelf = useCallback(async () => {
    setIsShelfLoading(true);
    setShelfError(undefined);
    try {
      const response = await fetch("/api/family-books");
      if (!response.ok) throw new Error("Shelf request failed");
      setShelf((await response.json() as { items: FamilyShelfItem[] }).items);
    } catch {
      setShelfError("Your shelf could not load. Try again.");
    } finally {
      setIsShelfLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void refreshShelf(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshShelf]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsOnline(window.navigator.onLine), 0);
    const online = () => { setIsOnline(true); setOfflineNotice(false); };
    const offline = () => { setIsOnline(false); setCapture(undefined); setFanOpen(false); setOfflineNotice(true); };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.clearTimeout(timeoutId); window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  useEffect(() => {
    if (!fanOpen) return;
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".bk-action-fan button:last-child:not(:disabled)")?.focus());
    function closeFan(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFanOpen(false);
      fabRef.current?.focus();
    }
    document.addEventListener("keydown", closeFan);
    return () => document.removeEventListener("keydown", closeFan);
  }, [fanOpen]);

  function openCapture(next: CaptureView) {
    setFanOpen(false);
    if (!window.navigator.onLine) {
      setIsOnline(false);
      setOfflineNotice(true);
      return;
    }
    setToast(undefined);
    setCapture(next);
  }

  function clearContextualReturn() {
    window.sessionStorage.removeItem("bookkin:return");
    setFanOpen(false);
  }

  async function handleAdded(message: string) {
    await refreshShelf();
    setCapture(undefined);
    setToast({ message, canLogAnother: false });
  }

  async function handleLogged(bookTitle: string) {
    await refreshShelf();
    setCapture(undefined);
    setToast({ message: `Reading moment saved for ${bookTitle}.`, canLogAnother: true });
  }

  const onShelf = pathname === "/";
  const onHistory = pathname === "/history" || pathname.startsWith("/books/");
  const contextValue: BookkinShellContextValue = {
    shelf,
    isShelfLoading,
    shelfError,
    refreshShelf,
    openAdd: () => openCapture("add"),
    openLog: () => openCapture("log"),
  };

  return (
    <BookkinShellContext.Provider value={contextValue}>
      <main className="bk-app">
        <div className="bk-product-window" data-bookkin-shell-content>
          <header className="bk-app-header">
            <Link className="bk-brand" href="/" onClick={clearContextualReturn}>
              <span aria-hidden="true" className="bk-brand-lens" />
              <span>Bookkin</span>
            </Link>
            <nav aria-label="Primary" className="bk-primary-nav">
              <Link aria-current={onShelf ? "page" : undefined} href="/" onClick={clearContextualReturn}>Shelf</Link>
              <Link aria-current={onHistory ? "page" : undefined} href="/history" onClick={clearContextualReturn}>History</Link>
            </nav>
          </header>
          {children}

          {offlineNotice ? <div className="bk-offline-notice" role="status"><strong>Bookkin is offline</strong><span>Reconnect to add books or save reading moments. Your shelf is still here.</span></div> : null}
          <div className="bk-quick-actions">
            {fanOpen ? (
              <div className="bk-action-fan">
                <button disabled={!isOnline} onClick={() => openCapture("add")} type="button"><span aria-hidden="true">＋</span>Add a book</button>
                <button disabled={!isOnline} onClick={() => openCapture("log")} type="button"><span aria-hidden="true">●</span>Log a read</button>
              </div>
            ) : null}
            <button aria-expanded={fanOpen} aria-label={fanOpen ? "Close quick actions" : "Open quick actions"} className="bk-fab" onClick={() => { if (!window.navigator.onLine) { setIsOnline(false); setOfflineNotice(true); setFanOpen(false); } else setFanOpen((current) => !current); }} ref={fabRef} type="button"><span aria-hidden="true">+</span></button>
          </div>
          {toast === undefined ? null : (
            <div className="bk-toast" role="status">
              <strong>{toast.message}</strong>
              {toast.canLogAnother ? <button onClick={() => openCapture("log")} type="button">Log another</button> : <button aria-label="Dismiss message" onClick={() => setToast(undefined)} type="button">Dismiss</button>}
            </div>
          )}
        </div>

        {capture === "add" ? <AddBookDialog onAdded={handleAdded} onClose={() => setCapture(undefined)} /> : null}
        {capture === "log" ? <QuickLogDialog onClose={() => setCapture(undefined)} onRequestAdd={() => setCapture("add")} onSaved={handleLogged} shelf={shelf} /> : null}
      </main>
    </BookkinShellContext.Provider>
  );
}
