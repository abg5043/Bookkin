import { expect, test, type Page } from "@playwright/test";

const isbn = "9780306406157";
// Bibliographic facts are verified against WorldCat record 7273374.
// Provider record IDs are explicit synthetic contract identifiers.
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

// The Snowy Day bibliographic facts are verified against publisher ISBN 9780670012701.
const searchResult = {
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

async function mockShelf(page: Page, initialItems: Array<Record<string, unknown>> = [], duplicate = false) {
  const items = [...initialItems];

  await page.route("**/api/family-books", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { items } });
      return;
    }

    const request = JSON.parse(route.request().postData() ?? "{}") as { shelfStatus?: string };
    if (!duplicate) {
      items.splice(0, items.length, {
        id: "family-book-1",
        title: verifiedBook.title,
        authors: verifiedBook.authors,
        shelfStatus: request.shelfStatus ?? "owned",
      });
    }

    await route.fulfill({
      status: duplicate ? 200 : 201,
      json: {
        familyBookId: "family-book-1",
        wasAlreadyOnShelf: duplicate,
        shelfStatus: request.shelfStatus ?? "owned",
      },
    });
  });
}

async function mockLookup(page: Page, status = 200) {
  await page.route("**/api/books/lookup?isbn=*", async (route) => {
    await route.fulfill({
      status,
      json: status === 200 ? verifiedBook : { error: "No Open Library record was found for this ISBN." },
    });
  });
}

async function mockSearch(page: Page, results: unknown[] = [searchResult], status = 200) {
  await page.route("**/api/books/search?*", async (route) => {
    await route.fulfill({
      status,
      json: status === 200 ? { results } : { error: "We could not reach Open Library. Nothing was saved." },
    });
  });
}

async function mockReadingHistory(page: Page) {
  const history = {
    id: "family-book-1",
    title: verifiedBook.title,
    authors: verifiedBook.authors,
    shelfStatus: "owned",
    rereadCount: 0,
    events: [] as Array<Record<string, unknown>>,
  };

  await page.route("**/api/family-books/family-book-1", async (route) => {
    await route.fulfill({ json: history });
  });
  await page.route("**/api/family-books/family-book-1/reading-events", async (route) => {
    const request = JSON.parse(route.request().postData() ?? "{}") as Record<string, string | undefined>;
    history.events.unshift({
      id: `event-${history.events.length + 1}`,
      eventType: request.eventType,
      childReaction: request.childReaction,
      parentReaction: request.parentReaction,
      stopReason: request.stopReason,
      occurredAt: "2026-08-07T12:00:00.000Z",
    });
    history.rereadCount = history.events.filter((event) => event.eventType === "reread").length;
    await route.fulfill({ status: 201, json: { event: history.events[0] } });
  });
}

test("adds a verified ISBN result to the family shelf", async ({ page }) => {
  await mockShelf(page);
  await mockLookup(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Books worth remembering." })).toBeVisible();
  await page.getByLabel("ISBN-10 or ISBN-13").fill("978-0-306-40615-7");
  await page.getByRole("button", { name: "Look up book" }).click();
  await expect(page.getByRole("heading", { name: "Error-Correction Coding for Digital Communications" })).toBeVisible();
  await page.getByRole("radio", { name: "Borrowed" }).check();
  await page.getByRole("button", { name: "Add to family shelf" }).click();

  await expect(page.getByText("Added to your family shelf.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Borrowed" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Owned" })).not.toBeChecked();
  await expect(page.getByText("Borrowed", { exact: true }).last()).toBeVisible();
});

test("rejects an invalid ISBN before lookup", async ({ page }) => {
  let lookupCount = 0;
  await mockShelf(page);
  await page.route("**/api/books/lookup?isbn=*", async (route) => {
    lookupCount += 1;
    await route.fulfill({ json: verifiedBook });
  });
  await page.goto("/");

  await page.getByLabel("ISBN-10 or ISBN-13").fill("9780306406158");
  await page.getByRole("button", { name: "Look up book" }).click();

  await expect(page.getByText("Enter a valid ISBN-10 or ISBN-13.", { exact: true })).toBeVisible();
  expect(lookupCount).toBe(0);
});

test("shows a clear not-found state", async ({ page }) => {
  await mockShelf(page);
  await mockLookup(page, 404);
  await page.goto("/");

  await page.getByLabel("ISBN-10 or ISBN-13").fill(isbn);
  await page.getByRole("button", { name: "Look up book" }).click();

  await expect(page.getByText("No Open Library record was found for this ISBN.", { exact: true })).toBeVisible();
});

test("shows a clear provider-error state without saving", async ({ page }) => {
  await mockShelf(page);
  await page.route("**/api/books/lookup?isbn=*", async (route) => {
    await route.fulfill({
      status: 502,
      json: { error: "We could not reach Open Library. Nothing was saved." },
    });
  });
  await page.goto("/");

  await page.getByLabel("ISBN-10 or ISBN-13").fill(isbn);
  await page.getByRole("button", { name: "Look up book" }).click();

  await expect(page.getByText("We could not reach Open Library. Nothing was saved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to family shelf" })).toHaveCount(0);
});

test("does not duplicate an ISBN already on the shelf", async ({ page }) => {
  await mockShelf(page, [{
    id: "family-book-1",
    title: verifiedBook.title,
    authors: verifiedBook.authors,
    shelfStatus: "owned",
  }], true);
  await mockLookup(page);
  await page.goto("/");

  await page.getByLabel("ISBN-10 or ISBN-13").fill(isbn);
  await page.getByRole("button", { name: "Look up book" }).click();
  await page.getByRole("button", { name: "Add to family shelf" }).click();

  await expect(page.getByText("Already on your shelf — its status is up to date.")).toBeVisible();
  await expect(page.getByText("1 book")).toBeVisible();
});

test("searches by title and saves a verified work through the shelf flow", async ({ page }) => {
  await mockShelf(page);
  await mockSearch(page);
  await page.goto("/");

  await page.getByRole("tab", { name: "Title" }).click();
  await page.getByLabel("Book title").fill("The Snowy Day");
  await page.getByRole("button", { name: "Search by title" }).click();
  await expect(page.getByRole("heading", { name: "Choose a work or edition." })).toBeVisible();
  await page.getByRole("button", { name: "Choose work" }).click();
  await page.getByRole("button", { name: "Add to family shelf" }).click();

  await expect(page.getByText("Added to your family shelf.")).toBeVisible();
  await expect(page.getByText("1 book")).toBeVisible();
});

test("searches by author", async ({ page }) => {
  await mockShelf(page);
  await mockSearch(page);
  await page.goto("/");

  await page.getByRole("tab", { name: "Author" }).click();
  await page.getByLabel("Author name").fill("Ezra Jack Keats");
  await page.getByRole("button", { name: "Search by author" }).click();

  await expect(page.getByRole("heading", { name: "The Snowy Day" })).toBeVisible();
  await expect(page.getByText("Work", { exact: true })).toBeVisible();
});

test("can select a matching edition from a verified work result", async ({ page }) => {
  await mockShelf(page);
  await mockSearch(page);
  await page.goto("/");

  await page.getByRole("tab", { name: "Title" }).click();
  await page.getByLabel("Book title").fill("The Snowy Day");
  await page.getByRole("button", { name: "Search by title" }).click();
  await page.getByRole("button", { name: "Use edition" }).click();

  await expect(page.getByText("Matching Open Library edition", { exact: true })).toBeVisible();
  await expect(page.getByText("ISBN 9780670012701", { exact: true })).toBeVisible();
});

test("shows clear no-results and provider-error states for search", async ({ page }) => {
  await mockShelf(page);
  await mockSearch(page, []);
  await page.goto("/");

  await page.getByRole("tab", { name: "Title" }).click();
  await page.getByLabel("Book title").fill("No match");
  await page.getByRole("button", { name: "Search by title" }).click();
  await expect(page.getByText("No verified books matched that title. Try a fuller title or different spelling.")).toBeVisible();
});

test("shows a provider error for search without creating a selection", async ({ page }) => {
  await mockShelf(page);
  await mockSearch(page, [], 502);
  await page.goto("/");

  await page.getByRole("tab", { name: "Author" }).click();
  await page.getByLabel("Author name").fill("No network");
  await page.getByRole("button", { name: "Search by author" }).click();

  await expect(page.getByText("We could not reach Open Library. Nothing was saved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to family shelf" })).toHaveCount(0);
});

test("does not duplicate a work selected from search", async ({ page }) => {
  await mockShelf(page, [{
    id: "family-book-1",
    title: searchResult.title,
    authors: searchResult.authors,
    shelfStatus: "owned",
  }], true);
  await mockSearch(page);
  await page.goto("/");

  await page.getByRole("tab", { name: "Title" }).click();
  await page.getByLabel("Book title").fill("The Snowy Day");
  await page.getByRole("button", { name: "Search by title" }).click();
  await page.getByRole("button", { name: "Choose work" }).click();
  await page.getByRole("button", { name: "Add to family shelf" }).click();

  await expect(page.getByText("Already on your shelf")).toBeVisible();
  await expect(page.getByText("1 book")).toBeVisible();
});

test("logs separate reactions and preserves reading history", async ({ page }) => {
  await mockShelf(page, [{
    id: "family-book-1",
    title: verifiedBook.title,
    authors: verifiedBook.authors,
    shelfStatus: "owned",
  }]);
  await mockReadingHistory(page);
  await page.goto("/");

  await page.getByRole("link", { name: "Log reading" }).click();
  await expect(page.getByRole("heading", { name: "What happened?" })).toBeVisible();
  await page.getByRole("group", { name: /Child’s reaction/ }).getByRole("radio", { name: "Love" }).check();
  await page.getByRole("group", { name: /Parent’s reaction/ }).getByRole("radio", { name: "Like", exact: true }).check();
  await page.getByRole("button", { name: "Save reading moment" }).click();
  await expect(page.getByText("Reading moment saved.")).toBeVisible();
  await expect(page.getByText("Child: Love")).toBeVisible();
  await expect(page.getByText("Parent: Like")).toBeVisible();

  await page.getByText("Rejected", { exact: true }).click();
  await expect(page.getByRole("group", { name: /Why/ })).toBeVisible();
  await page.getByRole("group", { name: /Why/ }).getByRole("radio", { name: "Too scary" }).check();
  await page.getByRole("button", { name: "Save reading moment" }).click();
  await expect(page.getByRole("heading", { name: "Rejected" })).toBeVisible();
  await expect(page.getByText("Reason: Too Scary")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finished" })).toBeVisible();
});

test("keeps discovery controls reachable by keyboard", async ({ page }) => {
  await mockShelf(page);
  await page.goto("/");

  const isbnField = page.getByLabel("ISBN-10 or ISBN-13");
  await isbnField.focus();
  await expect(isbnField).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Look up book" })).toBeFocused();
});

test("health endpoint reports an operational service", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.ok()).toBeTruthy();
  await expect(response).toBeOK();
  expect(await response.json()).toEqual({ service: "bookkin", status: "ok" });
});
