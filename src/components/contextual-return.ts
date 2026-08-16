export type ReturnOrigin = "shelf" | "history";

export type BookkinReturnContext = {
  origin: ReturnOrigin;
  bookId: string;
  scrollY: number;
  triggerId: string;
  createdAt: number;
  shelfSearch?: string;
  shelfFilter?: string;
};

const storageKey = "bookkin:return";
const maximumAgeMs = 30 * 60 * 1000;

export function saveReturnContext(context: Omit<BookkinReturnContext, "createdAt">) {
  window.sessionStorage.setItem(storageKey, JSON.stringify({ ...context, createdAt: Date.now() }));
}

export function readReturnContext(): BookkinReturnContext | undefined {
  const raw = window.sessionStorage.getItem(storageKey);
  if (raw === null) return undefined;
  try {
    const context = JSON.parse(raw) as BookkinReturnContext;
    if ((context.origin !== "shelf" && context.origin !== "history") || typeof context.bookId !== "string" || Date.now() - context.createdAt > maximumAgeMs) {
      window.sessionStorage.removeItem(storageKey);
      return undefined;
    }
    return context;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return undefined;
  }
}

export function clearReturnContext() {
  window.sessionStorage.removeItem(storageKey);
}
