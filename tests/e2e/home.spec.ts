import { expect, test, type Page } from "@playwright/test";

const isbn = "9780306406157";
const verifiedBook = {
  isbn,
  isbn13: isbn,
  title: "Error-Correction Coding for Digital Communications",
  authors: ["George C. Clark", "J. Bibb Cain"],
  subjects: [],
  workRecordId: "FIXTURE-WORK",
  editionRecordId: "FIXTURE-EDITION",
  fieldCoverage: { title: "edition.title", ageGuidance: "missing" },
};
const snowyResult = {
  title: "The Snowy Day",
  authors: ["Ezra Jack Keats"],
  subjects: [],
  workRecordId: "FIXTURE-SNOWY-DAY-WORK",
  firstPublishYear: 1962,
  fieldCoverage: { title: "search.title", authors: "search.author_name" },
  matchingEdition: {
    editionRecordId: "FIXTURE-SNOWY-DAY-EDITION",
    title: "The Snowy Day",
    isbn: "9780670012701",
    publicationDate: "2011",
  },
};
const shelfBook = {
  id: "family-book-1",
  title: verifiedBook.title,
  authors: verifiedBook.authors,
  shelfStatus: "owned",
  lastReadAt: "2026-08-15T12:00:00.000Z",
};

async function mockShelf(page: Page, initialItems: Array<Record<string, unknown>> = [], duplicate = false) {
  const items = [...initialItems];
  await page.route("**/api/family-books", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { items } });
      return;
    }
    const request = JSON.parse(route.request().postData() ?? "{}") as { shelfStatus?: string };
    if (!duplicate) items.splice(0, items.length, { ...shelfBook, shelfStatus: request.shelfStatus ?? "owned" });
    await route.fulfill({
      status: duplicate ? 200 : 201,
      json: { familyBookId: shelfBook.id, wasAlreadyOnShelf: duplicate, shelfStatus: request.shelfStatus ?? "owned" },
    });
  });
}

async function mockLookup(page: Page, status = 200) {
  await page.route("**/api/books/lookup?isbn=*", async (route) => {
    await route.fulfill({ status, json: status === 200 ? verifiedBook : { error: "No Open Library record was found for this ISBN." } });
  });
}

async function mockSearch(page: Page, results: unknown[] = [snowyResult], status = 200) {
  await page.route("**/api/books/search?*", async (route) => {
    await route.fulfill({ status, json: status === 200 ? { results } : { error: "We could not reach Open Library. Nothing was saved." } });
  });
}

function historyFixture(events: Array<Record<string, unknown>> = []) {
  return { ...shelfBook, rereadCount: events.filter((event) => event.eventType === "reread").length, events };
}

async function mockBookHistory(page: Page, startingEvents: Array<Record<string, unknown>> = []) {
  const history = historyFixture([...startingEvents]);
  await page.route("**/api/family-books/family-book-1", async (route) => { await route.fulfill({ json: history }); });
  await page.route("**/api/family-books/family-book-1/reading-events", async (route) => {
    const request = JSON.parse(route.request().postData() ?? "{}") as Record<string, string | undefined>;
    const event = { id: `event-${history.events.length + 1}`, ...request, occurredAt: "2026-08-15T12:00:00.000Z" };
    history.events.unshift(event);
    await route.fulfill({ status: 201, json: { event } });
  });
  return history;
}

async function mockHouseholdHistory(page: Page, items: unknown[]) {
  await page.route("**/api/reading-history", async (route) => { await route.fulfill({ json: { items } }); });
}

async function openAdd(page: Page) {
  await page.getByRole("button", { name: "Open quick actions" }).click();
  await page.locator(".bk-action-fan").getByRole("button", { name: "Add a book", exact: true }).click();
  return page.getByRole("dialog", { name: "Add a book" });
}

async function openQuickLog(page: Page) {
  await page.getByRole("button", { name: "Open quick actions" }).click();
  await page.getByRole("button", { name: "Log a read", exact: true }).click();
  return page.getByRole("dialog", { name: "Log a read" });
}

test("adds a verified ISBN with an explicit shelf status", async ({ page }) => {
  await mockShelf(page);
  await mockLookup(page);
  await page.goto("/");
  const dialog = await openAdd(page);
  await dialog.getByRole("tab", { name: "ISBN" }).click();
  await dialog.getByLabel("ISBN-10 or ISBN-13").fill("978-0-306-40615-7");
  await dialog.getByRole("button", { name: "Search" }).click();
  await expect(dialog.getByRole("heading", { name: verifiedBook.title })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Owned" })).toHaveAttribute("aria-pressed", "false");
  await expect(dialog.getByRole("button", { name: "Add to shelf" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Borrowed" }).click();
  await dialog.getByRole("button", { name: "Add to shelf" }).click();
  await expect(page.getByText("Book added to your shelf.")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(verifiedBook.title) }).getByText("Borrowed", { exact: true })).toBeVisible();
});

test("keeps invalid and provider-error Add states inside the modal", async ({ page }) => {
  await mockShelf(page);
  await mockLookup(page, 404);
  await page.goto("/");
  const dialog = await openAdd(page);
  await dialog.getByRole("tab", { name: "ISBN" }).click();
  await dialog.getByLabel("ISBN-10 or ISBN-13").fill("9780306406158");
  await dialog.getByRole("button", { name: "Search" }).click();
  await expect(dialog.getByText("Enter a valid ISBN-10 or ISBN-13.")).toBeVisible();
  await dialog.getByLabel("ISBN-10 or ISBN-13").fill(isbn);
  await dialog.getByRole("button", { name: "Search" }).click();
  await expect(dialog.getByText("No Open Library record was found for this ISBN.")).toBeVisible();
});

test("searches by title and adds a verified work without duplicate UI", async ({ page }) => {
  await mockShelf(page);
  await mockSearch(page);
  await page.goto("/");
  const dialog = await openAdd(page);
  await dialog.getByLabel("Book title").fill("The Snowy Day");
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("button", { name: "Choose", exact: true }).click();
  await dialog.getByRole("button", { name: "Wishlist" }).click();
  await dialog.getByRole("button", { name: "Add to shelf" }).click();
  await expect(page.getByText("Book added to your shelf.")).toBeVisible();
});

test("reports a duplicate without creating another shelf card", async ({ page }) => {
  await mockShelf(page, [shelfBook], true);
  await mockLookup(page);
  await page.goto("/");
  const dialog = await openAdd(page);
  await dialog.getByRole("tab", { name: "ISBN" }).click();
  await dialog.getByLabel("ISBN-10 or ISBN-13").fill(isbn);
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("button", { name: "Owned" }).click();
  await dialog.getByRole("button", { name: "Add to shelf" }).click();
  await expect(page.getByText("Already on your shelf. Its status is up to date.")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(verifiedBook.title) })).toHaveCount(1);
});

test("searches and filters a growing shelf", async ({ page }) => {
  await mockShelf(page, [shelfBook, { id: "family-book-2", title: "The Snowy Day", authors: ["Ezra Jack Keats"], shelfStatus: "borrowed" }]);
  await page.goto("/");
  await page.getByPlaceholder("Search title or author").fill("snowy");
  await expect(page.getByRole("link", { name: /The Snowy Day/ })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(verifiedBook.title) })).toHaveCount(0);
  await page.getByRole("group", { name: "Shelf status" }).getByRole("button", { name: "Owned" }).click();
  await expect(page.getByText("No shelf books match.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(page.getByText("2 books")).toBeVisible();
});

test("Quick Log starts blank, records separate reactions, and resets for Log another", async ({ page }) => {
  await mockShelf(page, [shelfBook]);
  await mockBookHistory(page);
  await page.goto("/");
  let dialog = await openQuickLog(page);
  await expect(dialog.getByRole("button", { name: "Save reading moment" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: new RegExp(verifiedBook.title) })).toHaveAttribute("aria-pressed", "false");
  await expect(dialog.getByRole("button", { name: "Finished" })).toHaveAttribute("aria-pressed", "false");
  await dialog.getByRole("button", { name: new RegExp(verifiedBook.title) }).click();
  await dialog.getByRole("button", { name: "Read again" }).click();
  await dialog.getByRole("button", { name: "Optional reactions" }).click();
  await dialog.getByRole("group", { name: "Child" }).getByRole("button", { name: "Love" }).click();
  await dialog.getByRole("group", { name: "Caregiver" }).getByRole("button", { name: "Like", exact: true }).click();
  await dialog.getByRole("button", { name: "Save reading moment" }).click();
  await expect(page.getByText(new RegExp(`Reading moment saved for ${verifiedBook.title}`))).toBeVisible();
  await page.getByRole("button", { name: "Log another" }).click();
  dialog = page.getByRole("dialog", { name: "Log a read" });
  await expect(dialog.getByRole("button", { name: "Save reading moment" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Read again" })).toHaveAttribute("aria-pressed", "false");
});

test("Quick Log retains choices after a failed save and offers optional stop reasons", async ({ page }) => {
  await mockShelf(page, [shelfBook]);
  await page.route("**/api/family-books/family-book-1/reading-events", async (route) => { await route.fulfill({ status: 500, json: { error: "That reading moment was not saved." } }); });
  await page.goto("/");
  const dialog = await openQuickLog(page);
  await dialog.getByRole("button", { name: new RegExp(verifiedBook.title) }).click();
  await dialog.getByRole("button", { name: "Stopped reading" }).click();
  await dialog.getByRole("button", { name: "Too scary" }).click();
  await dialog.getByRole("button", { name: "Save reading moment" }).click();
  await expect(dialog.getByText("That reading moment was not saved.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Stopped reading" })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: "Too scary" })).toHaveAttribute("aria-pressed", "true");
});

test("prevents Add and Log entry while offline", async ({ page, context }) => {
  await mockShelf(page, [shelfBook]);
  await page.goto("/");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Open quick actions" }).click();
  await expect(page.getByText("Bookkin is offline")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.setOffline(false);
});

test("Shelf book history returns to the filtered Shelf with focus restored", async ({ page }) => {
  await mockShelf(page, [shelfBook]);
  await mockBookHistory(page);
  await page.goto("/");
  await page.getByPlaceholder("Search title or author").fill("error");
  await page.getByRole("group", { name: "Shelf status" }).getByRole("button", { name: "Owned" }).click();
  const bookLink = page.getByRole("link", { name: new RegExp(verifiedBook.title) });
  await bookLink.click();
  await expect(page.getByRole("button", { name: "Back to Shelf" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Shelf" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByPlaceholder("Search title or author")).toHaveValue("error");
  await expect(page.getByRole("group", { name: "Shelf status" }).getByRole("button", { name: "Owned" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: new RegExp(verifiedBook.title) })).toBeFocused();
});

test("household History opens one book and returns to the originating row", async ({ page }) => {
  const event = { id: "event-1", eventType: "reread", childReaction: "love", parentReaction: "like", occurredAt: "2026-08-15T12:00:00.000Z" };
  const history = historyFixture([event]);
  await mockShelf(page, [shelfBook]);
  await mockHouseholdHistory(page, [history]);
  await mockBookHistory(page, [event]);
  await page.goto("/history");
  const row = page.getByRole("link", { name: new RegExp(verifiedBook.title) });
  await expect(page.getByText("Child · Love")).toBeVisible();
  await row.click();
  await expect(page.getByRole("button", { name: "Back to History" })).toBeVisible();
  await expect(page.getByText("Caregiver · Like")).toBeVisible();
  await page.getByRole("button", { name: "Back to History" }).click();
  await expect(page).toHaveURL("/history");
  await expect(page.getByRole("link", { name: new RegExp(verifiedBook.title) })).toBeFocused();
});

test("direct book links fall back to household History", async ({ page }) => {
  await mockShelf(page, [shelfBook]);
  await mockBookHistory(page);
  await mockHouseholdHistory(page, []);
  await page.goto("/books/family-book-1");
  await page.getByRole("button", { name: "Back to History" }).click();
  await expect(page).toHaveURL("/history");
});

test("the action fan and modal preserve keyboard focus", async ({ page }) => {
  await mockShelf(page);
  await page.goto("/");
  const fab = page.getByRole("button", { name: "Open quick actions" });
  await fab.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Log a read", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Log a read" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open quick actions" })).toBeFocused();
});

test("health endpoint reports an operational service", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ service: "bookkin", status: "ok" });
});
